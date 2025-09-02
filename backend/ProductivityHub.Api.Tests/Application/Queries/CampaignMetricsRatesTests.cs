using ProductivityHub.Api.Application.Queries;
using Xunit;

namespace ProductivityHub.Api.Tests.Application.Queries;

/// <summary>
/// Unit tests for CampaignMetricsRates calculation logic
/// </summary>
public class CampaignMetricsRatesTests
{
    [Fact]
    public void FromTotals_WithZeroSent_ReturnsZeroRates()
    {
        // Arrange
        var totals = new CampaignMetricsTotals(
            Sent: 0,
            Delivered: 0,
            Failed: 0,
            Open: 0,
            Click: 0
        );

        // Act
        var rates = CampaignMetricsRates.FromTotals(totals);

        // Assert
        Assert.Equal(0.0, rates.Delivered);
        Assert.Equal(0.0, rates.Failure);
        Assert.Equal(0.0, rates.Open);
        Assert.Equal(0.0, rates.Click);
    }

    [Fact]
    public void FromTotals_WithZeroSentButNonZeroOthers_ReturnsZeroRates()
    {
        // Arrange - impossible scenario but should handle gracefully
        var totals = new CampaignMetricsTotals(
            Sent: 0,
            Delivered: 100,
            Failed: 50,
            Open: 25,
            Click: 10
        );

        // Act
        var rates = CampaignMetricsRates.FromTotals(totals);

        // Assert
        Assert.Equal(0.0, rates.Delivered);
        Assert.Equal(0.0, rates.Failure);
        Assert.Equal(0.0, rates.Open);
        Assert.Equal(0.0, rates.Click);
    }

    [Fact]
    public void FromTotals_WithNormalData_CalculatesCorrectRates()
    {
        // Arrange
        var totals = new CampaignMetricsTotals(
            Sent: 1000,
            Delivered: 950,
            Failed: 50,
            Open: 400,
            Click: 120
        );

        // Act
        var rates = CampaignMetricsRates.FromTotals(totals);

        // Assert
        Assert.Equal(0.95, rates.Delivered);    // 950 / 1000 = 0.95
        Assert.Equal(0.05, rates.Failure);     // 50 / 1000 = 0.05  
        Assert.Equal(0.4, rates.Open);         // 400 / 1000 = 0.4
        Assert.Equal(0.12, rates.Click);       // 120 / 1000 = 0.12
    }

    [Fact]
    public void FromTotals_WithPrecisionRounding_RoundsToFourDecimals()
    {
        // Arrange
        var totals = new CampaignMetricsTotals(
            Sent: 3,
            Delivered: 2,
            Failed: 1,
            Open: 1,
            Click: 1
        );

        // Act
        var rates = CampaignMetricsRates.FromTotals(totals);

        // Assert
        Assert.Equal(0.6667, rates.Delivered); // 2/3 = 0.666666... rounded to 0.6667
        Assert.Equal(0.3333, rates.Failure);   // 1/3 = 0.333333... rounded to 0.3333
        Assert.Equal(0.3333, rates.Open);      // 1/3 = 0.333333... rounded to 0.3333
        Assert.Equal(0.3333, rates.Click);     // 1/3 = 0.333333... rounded to 0.3333
    }

    [Fact]
    public void FromTotals_WithPerfectDelivery_ReturnsCorrectRates()
    {
        // Arrange
        var totals = new CampaignMetricsTotals(
            Sent: 500,
            Delivered: 500,
            Failed: 0,
            Open: 250,
            Click: 100
        );

        // Act
        var rates = CampaignMetricsRates.FromTotals(totals);

        // Assert
        Assert.Equal(1.0, rates.Delivered);
        Assert.Equal(0.0, rates.Failure);
        Assert.Equal(0.5, rates.Open);
        Assert.Equal(0.2, rates.Click);
    }

    [Fact]
    public void FromTotals_WithHighFailureRate_ReturnsCorrectRates()
    {
        // Arrange
        var totals = new CampaignMetricsTotals(
            Sent: 1000,
            Delivered: 200,
            Failed: 800,
            Open: 50,
            Click: 10
        );

        // Act
        var rates = CampaignMetricsRates.FromTotals(totals);

        // Assert
        Assert.Equal(0.2, rates.Delivered);
        Assert.Equal(0.8, rates.Failure);
        Assert.Equal(0.05, rates.Open);
        Assert.Equal(0.01, rates.Click);
    }

    [Fact]
    public void FromTotals_WithVerySmallNumbers_HandlesCorrectly()
    {
        // Arrange
        var totals = new CampaignMetricsTotals(
            Sent: 1,
            Delivered: 1,
            Failed: 0,
            Open: 0,
            Click: 0
        );

        // Act
        var rates = CampaignMetricsRates.FromTotals(totals);

        // Assert
        Assert.Equal(1.0, rates.Delivered);
        Assert.Equal(0.0, rates.Failure);
        Assert.Equal(0.0, rates.Open);
        Assert.Equal(0.0, rates.Click);
    }

    [Theory]
    [InlineData(10000, 9500, 500, 4000, 1200, 0.95, 0.05, 0.4, 0.12)]
    [InlineData(5000, 4900, 100, 2450, 980, 0.98, 0.02, 0.49, 0.196)]
    [InlineData(100, 95, 5, 40, 12, 0.95, 0.05, 0.4, 0.12)]
    public void FromTotals_WithVariousInputs_CalculatesExpectedRates(
        long sent, long delivered, long failed, long open, long click,
        double expectedDelivered, double expectedFailure, double expectedOpen, double expectedClick)
    {
        // Arrange
        var totals = new CampaignMetricsTotals(sent, delivered, failed, open, click);

        // Act
        var rates = CampaignMetricsRates.FromTotals(totals);

        // Assert
        Assert.Equal(expectedDelivered, rates.Delivered, precision: 4);
        Assert.Equal(expectedFailure, rates.Failure, precision: 4);
        Assert.Equal(expectedOpen, rates.Open, precision: 4);
        Assert.Equal(expectedClick, rates.Click, precision: 4);
    }

    [Fact]
    public void FromTotals_DoesNotThrowOnLargeNumbers()
    {
        // Arrange - test with large numbers that might cause overflow
        var totals = new CampaignMetricsTotals(
            Sent: long.MaxValue / 2,
            Delivered: long.MaxValue / 4,
            Failed: long.MaxValue / 8,
            Open: long.MaxValue / 16,
            Click: long.MaxValue / 32
        );

        // Act & Assert - should not throw
        var rates = CampaignMetricsRates.FromTotals(totals);
        
        Assert.True(rates.Delivered >= 0 && rates.Delivered <= 1);
        Assert.True(rates.Failure >= 0 && rates.Failure <= 1);
        Assert.True(rates.Open >= 0 && rates.Open <= 1);
        Assert.True(rates.Click >= 0 && rates.Click <= 1);
    }
}