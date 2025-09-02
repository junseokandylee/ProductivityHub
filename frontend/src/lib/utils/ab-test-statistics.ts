/**
 * Statistical functions for A/B test analysis and significance testing
 */

/**
 * A/B test variant data structure
 */
export interface AbVariant {
  name: string
  sent: number
  delivered: number
  opened: number
  clicked: number
  conversions?: number // Generic conversion metric
  deliveryRate: number
  openRate: number
  clickRate: number
  conversionRate?: number
}

/**
 * Statistical test result
 */
export interface StatisticalTest {
  zScore: number
  pValue: number
  isSignificant: boolean
  confidenceLevel: number
  lift: number
  liftPercentage: number
}

/**
 * A/B test comparison result
 */
export interface AbTestResult {
  controlVariant: AbVariant
  testVariant: AbVariant
  deliveryTest: StatisticalTest
  openRateTest: StatisticalTest
  clickRateTest: StatisticalTest
  conversionTest?: StatisticalTest
  overallWinner: 'control' | 'test' | 'inconclusive'
  primaryMetric: 'delivery' | 'openRate' | 'clickRate' | 'conversion'
}

/**
 * Standard normal cumulative distribution function (approximation)
 * Used to calculate p-values from z-scores
 */
function standardNormalCDF(z: number): number {
  // Abramowitz and Stegun approximation
  const sign = z >= 0 ? 1 : -1
  z = Math.abs(z)
  
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911
  
  const t = 1.0 / (1.0 + p * z)
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z)
  
  return 0.5 * (1.0 + sign * y)
}

/**
 * Compute two-proportion z-test for comparing conversion rates between variants
 * @param n1 Sample size for variant 1
 * @param c1 Conversions for variant 1
 * @param n2 Sample size for variant 2  
 * @param c2 Conversions for variant 2
 * @param confidenceLevel Confidence level (default 0.95 for 95%)
 * @returns Statistical test result
 */
export function computeTwoProportionZTest(
  n1: number,
  c1: number,
  n2: number,
  c2: number,
  confidenceLevel: number = 0.95
): StatisticalTest {
  // Handle edge cases
  if (n1 <= 0 || n2 <= 0) {
    return {
      zScore: 0,
      pValue: 1,
      isSignificant: false,
      confidenceLevel,
      lift: 0,
      liftPercentage: 0
    }
  }

  // Calculate proportions
  const p1 = Math.max(0, Math.min(1, c1 / n1)) // Clamp to [0,1]
  const p2 = Math.max(0, Math.min(1, c2 / n2)) // Clamp to [0,1]
  
  // Pooled proportion for null hypothesis
  const pooledP = (c1 + c2) / (n1 + n2)
  
  // Standard error under null hypothesis
  const standardError = Math.sqrt(pooledP * (1 - pooledP) * (1/n1 + 1/n2))
  
  // Avoid division by zero
  if (standardError === 0) {
    return {
      zScore: 0,
      pValue: 1,
      isSignificant: false,
      confidenceLevel,
      lift: p2 - p1,
      liftPercentage: p1 > 0 ? ((p2 - p1) / p1) * 100 : 0
    }
  }
  
  // Calculate z-score
  const zScore = (p2 - p1) / standardError
  
  // Calculate two-tailed p-value
  const pValue = 2 * (1 - standardNormalCDF(Math.abs(zScore)))
  
  // Determine significance
  const alpha = 1 - confidenceLevel
  const isSignificant = pValue < alpha
  
  // Calculate lift
  const lift = p2 - p1
  const liftPercentage = p1 > 0 ? ((p2 - p1) / p1) * 100 : 0
  
  return {
    zScore,
    pValue,
    isSignificant,
    confidenceLevel,
    lift,
    liftPercentage
  }
}

/**
 * Perform comprehensive A/B test analysis
 * @param control Control variant data
 * @param test Test variant data
 * @param primaryMetric Primary metric to determine overall winner
 * @param confidenceLevel Confidence level for significance testing
 * @returns Complete A/B test analysis result
 */
export function analyzeAbTest(
  control: AbVariant,
  test: AbVariant,
  primaryMetric: 'delivery' | 'openRate' | 'clickRate' | 'conversion' = 'clickRate',
  confidenceLevel: number = 0.95
): AbTestResult {
  // Delivery rate test
  const deliveryTest = computeTwoProportionZTest(
    control.sent,
    control.delivered,
    test.sent,
    test.delivered,
    confidenceLevel
  )
  
  // Open rate test (based on delivered messages)
  const openRateTest = computeTwoProportionZTest(
    control.delivered,
    control.opened,
    test.delivered,
    test.opened,
    confidenceLevel
  )
  
  // Click rate test (based on delivered messages)
  const clickRateTest = computeTwoProportionZTest(
    control.delivered,
    control.clicked,
    test.delivered,
    test.clicked,
    confidenceLevel
  )
  
  // Conversion test (if conversion data is available)
  let conversionTest: StatisticalTest | undefined
  if (control.conversions !== undefined && test.conversions !== undefined) {
    conversionTest = computeTwoProportionZTest(
      control.sent,
      control.conversions,
      test.sent,
      test.conversions,
      confidenceLevel
    )
  }
  
  // Determine overall winner based on primary metric
  let overallWinner: 'control' | 'test' | 'inconclusive' = 'inconclusive'
  
  const primaryTest = {
    delivery: deliveryTest,
    openRate: openRateTest,
    clickRate: clickRateTest,
    conversion: conversionTest
  }[primaryMetric]
  
  if (primaryTest && primaryTest.isSignificant) {
    overallWinner = primaryTest.lift > 0 ? 'test' : 'control'
  }
  
  return {
    controlVariant: control,
    testVariant: test,
    deliveryTest,
    openRateTest,
    clickRateTest,
    conversionTest,
    overallWinner,
    primaryMetric
  }
}

/**
 * Calculate minimum sample size for detecting a given effect size
 * @param baseRate Current conversion rate (0-1)
 * @param minDetectableEffect Minimum effect size to detect (e.g., 0.1 for 10% relative improvement)
 * @param power Statistical power (default 0.8)
 * @param alpha Significance level (default 0.05)
 * @returns Minimum sample size per variant
 */
export function calculateMinimumSampleSize(
  baseRate: number,
  minDetectableEffect: number,
  power: number = 0.8,
  alpha: number = 0.05
): number {
  // Z-scores for alpha/2 and beta
  const zAlpha = 1.96 // For alpha = 0.05 (two-tailed)
  const zBeta = 0.84   // For power = 0.8
  
  const p1 = baseRate
  const p2 = baseRate * (1 + minDetectableEffect)
  
  const pooledP = (p1 + p2) / 2
  const numerator = (zAlpha * Math.sqrt(2 * pooledP * (1 - pooledP)) + 
                    zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2
  const denominator = (p2 - p1) ** 2
  
  return Math.ceil(numerator / denominator)
}

/**
 * Format p-value for display
 */
export function formatPValue(pValue: number): string {
  if (pValue < 0.001) {
    return 'p < 0.001'
  } else if (pValue < 0.01) {
    return `p = ${pValue.toFixed(3)}`
  } else if (pValue < 0.05) {
    return `p = ${pValue.toFixed(3)}`
  } else {
    return `p = ${pValue.toFixed(2)}`
  }
}

/**
 * Get significance level label
 */
export function getSignificanceLabel(pValue: number): {
  level: 'highly-significant' | 'significant' | 'marginal' | 'not-significant'
  label: string
  color: string
} {
  if (pValue < 0.001) {
    return {
      level: 'highly-significant',
      label: 'Highly Significant',
      color: 'text-green-700 bg-green-50 border-green-200'
    }
  } else if (pValue < 0.01) {
    return {
      level: 'significant',
      label: 'Very Significant',
      color: 'text-green-600 bg-green-50 border-green-200'
    }
  } else if (pValue < 0.05) {
    return {
      level: 'significant',
      label: 'Significant',
      color: 'text-green-600 bg-green-50 border-green-200'
    }
  } else if (pValue < 0.1) {
    return {
      level: 'marginal',
      label: 'Marginal',
      color: 'text-yellow-600 bg-yellow-50 border-yellow-200'
    }
  } else {
    return {
      level: 'not-significant',
      label: 'Not Significant',
      color: 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }
}