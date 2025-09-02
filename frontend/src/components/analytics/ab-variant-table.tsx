'use client'

import React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, TrendingUp, TrendingDown, Minus, Info, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  analyzeAbTest,
  formatPValue,
  getSignificanceLabel,
  type AbVariant,
  type AbTestResult
} from '@/lib/utils/ab-test-statistics'

interface AbVariantTableProps {
  variants: AbVariant[]
  primaryMetric?: 'delivery' | 'openRate' | 'clickRate' | 'conversion'
  isLoading?: boolean
  error?: Error | null
  onRefresh?: () => void
  className?: string
}

interface MetricCellProps {
  value: number
  format: 'number' | 'percentage'
  comparison?: {
    baseline: number
    lift: number
    liftPercentage: number
    isSignificant: boolean
    pValue: number
  }
}

function MetricCell({ value, format, comparison }: MetricCellProps) {
  const formattedValue = format === 'percentage' 
    ? `${(value * 100).toFixed(1)}%`
    : value.toLocaleString()

  if (!comparison) {
    return <span className="font-mono text-sm">{formattedValue}</span>
  }

  const { lift, liftPercentage, isSignificant, pValue } = comparison
  const isPositive = lift > 0
  const Icon = isPositive ? TrendingUp : lift < 0 ? TrendingDown : Minus
  const significance = getSignificanceLabel(pValue)

  return (
    <div className="space-y-1">
      <span className="font-mono text-sm">{formattedValue}</span>
      <div className="flex items-center gap-2">
        <div className={cn(
          "flex items-center gap-1 text-xs",
          isPositive ? "text-green-600" : lift < 0 ? "text-red-600" : "text-gray-500"
        )}>
          <Icon className="h-3 w-3" />
          <span>
            {format === 'percentage' 
              ? `${liftPercentage >= 0 ? '+' : ''}${liftPercentage.toFixed(1)}%`
              : `${lift >= 0 ? '+' : ''}${lift.toLocaleString()}`
            }
          </span>
        </div>
        {isSignificant && (
          <Badge variant="outline" className={cn("text-xs px-1 py-0", significance.color)} aria-label={`Statistically significant with p-value ${formatPValue(pValue)}`}>
            ✓
            <span className="sr-only">Statistically significant</span>
          </Badge>
        )}
      </div>
    </div>
  )
}

export function AbVariantTable({ 
  variants, 
  primaryMetric = 'clickRate', 
  isLoading, 
  error, 
  onRefresh,
  className 
}: AbVariantTableProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-32" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn("border-red-200", className)}>
        <CardContent className="p-6">
          <Alert className="border-red-200">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Failed to load A/B test data</span>
              {onRefresh && (
                <Button variant="outline" size="sm" onClick={onRefresh} className="ml-2">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!variants || variants.length < 2) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center text-muted-foreground">
          <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No A/B test data available</p>
          <p className="text-sm">Need at least 2 variants to compare</p>
        </CardContent>
      </Card>
    )
  }

  // Assume first variant is control, others are test variants
  const [control, ...testVariants] = variants
  
  // Analyze each test variant against control
  const analyses = testVariants.map(test => 
    analyzeAbTest(control, test, primaryMetric)
  )

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-blue-100 rounded flex items-center justify-center">
              <span className="text-blue-600 text-xs font-bold">AB</span>
            </div>
            <span>Variant Performance Comparison</span>
          </div>
          <Badge variant="outline" className="capitalize">
            Primary: {primaryMetric.replace(/([A-Z])/g, ' $1').toLowerCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Comparison Table */}
          <div className="rounded-md border">
            <Table role="table" aria-label="A/B test variant performance comparison table">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Variant</TableHead>
                  <TableHead className="text-center">Messages Sent</TableHead>
                  <TableHead className="text-center">Delivery Rate</TableHead>
                  <TableHead className="text-center">Open Rate</TableHead>
                  <TableHead className="text-center">Click Rate</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Control Row */}
                <TableRow className="bg-muted/50">
                  <TableCell>
                    <div>
                      <span className="font-medium">{control.name}</span>
                      <Badge variant="outline" className="ml-2 text-xs">Control</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <MetricCell value={control.sent} format="number" />
                  </TableCell>
                  <TableCell className="text-center">
                    <MetricCell value={control.deliveryRate} format="percentage" />
                  </TableCell>
                  <TableCell className="text-center">
                    <MetricCell value={control.openRate} format="percentage" />
                  </TableCell>
                  <TableCell className="text-center">
                    <MetricCell value={control.clickRate} format="percentage" />
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm text-muted-foreground">Baseline</span>
                  </TableCell>
                </TableRow>

                {/* Test Variant Rows */}
                {testVariants.map((variant, index) => {
                  const analysis = analyses[index]
                  const isWinner = analysis.overallWinner === 'test'
                  
                  return (
                    <TableRow key={variant.name} className={cn(
                      isWinner && "bg-green-50"
                    )}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{variant.name}</span>
                          {isWinner && (
                            <Badge variant="outline" className="text-green-600 border-green-300 text-xs">
                              Winner
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <MetricCell value={variant.sent} format="number" />
                      </TableCell>
                      <TableCell className="text-center">
                        <MetricCell 
                          value={variant.deliveryRate} 
                          format="percentage"
                          comparison={{
                            baseline: control.deliveryRate,
                            lift: analysis.deliveryTest.lift,
                            liftPercentage: analysis.deliveryTest.liftPercentage,
                            isSignificant: analysis.deliveryTest.isSignificant,
                            pValue: analysis.deliveryTest.pValue
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <MetricCell 
                          value={variant.openRate} 
                          format="percentage"
                          comparison={{
                            baseline: control.openRate,
                            lift: analysis.openRateTest.lift,
                            liftPercentage: analysis.openRateTest.liftPercentage,
                            isSignificant: analysis.openRateTest.isSignificant,
                            pValue: analysis.openRateTest.pValue
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <MetricCell 
                          value={variant.clickRate} 
                          format="percentage"
                          comparison={{
                            baseline: control.clickRate,
                            lift: analysis.clickRateTest.lift,
                            liftPercentage: analysis.clickRateTest.liftPercentage,
                            isSignificant: analysis.clickRateTest.isSignificant,
                            pValue: analysis.clickRateTest.pValue
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="text-xs space-y-1">
                          {Object.entries({
                            'Delivery': analysis.deliveryTest,
                            'Open': analysis.openRateTest,
                            'Click': analysis.clickRateTest
                          }).map(([key, test]) => (
                            <div key={key} className="flex items-center gap-1 justify-center">
                              <span className="w-12 text-left">{key}:</span>
                              <span className="font-mono">{formatPValue(test.pValue)}</span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Statistical Disclaimer */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">Statistical Analysis Notes</p>
                <ul className="space-y-1 text-xs">
                  <li>• Significance testing uses two-proportion z-test (p &lt; 0.05)</li>
                  <li>• ✓ indicates statistically significant difference</li>
                  <li>• Results are heuristic; consider practical significance and sample size</li>
                  <li>• Run tests longer for more reliable results</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}