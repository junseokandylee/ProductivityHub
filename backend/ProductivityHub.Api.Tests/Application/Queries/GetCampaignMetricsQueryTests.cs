using ProductivityHub.Api.Application.Queries;
using Xunit;

namespace ProductivityHub.Api.Tests.Application.Queries;

/// <summary>
/// Unit tests for GetCampaignMetricsQuery validation and logic
/// </summary>
public class GetCampaignMetricsQueryTests
{
    [Fact]
    public void IsValid_WithValidParameters_ReturnsTrue()
    {
        // Arrange
        var query = new GetCampaignMetricsQuery(
            CampaignId: Guid.NewGuid(),
            TenantId: Guid.NewGuid(),
            WindowMinutes: 60,
            IncludeTimeseries: true
        );

        // Act
        var isValid = query.IsValid(out var errorMessage);

        // Assert
        Assert.True(isValid);
        Assert.Null(errorMessage);
    }

    [Fact]
    public void IsValid_WithEmptyCampaignId_ReturnsFalse()
    {
        // Arrange
        var query = new GetCampaignMetricsQuery(
            CampaignId: Guid.Empty,
            TenantId: Guid.NewGuid(),
            WindowMinutes: 60
        );

        // Act
        var isValid = query.IsValid(out var errorMessage);

        // Assert
        Assert.False(isValid);
        Assert.Equal("Campaign ID is required", errorMessage);
    }

    [Fact]
    public void IsValid_WithEmptyTenantId_ReturnsFalse()
    {
        // Arrange
        var query = new GetCampaignMetricsQuery(
            CampaignId: Guid.NewGuid(),
            TenantId: Guid.Empty,
            WindowMinutes: 60
        );

        // Act
        var isValid = query.IsValid(out var errorMessage);

        // Assert
        Assert.False(isValid);
        Assert.Equal("Tenant ID is required", errorMessage);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(-60)]
    public void IsValid_WithInvalidWindowMinutes_ReturnsFalse(int invalidWindowMinutes)
    {
        // Arrange
        var query = new GetCampaignMetricsQuery(
            CampaignId: Guid.NewGuid(),
            TenantId: Guid.NewGuid(),
            WindowMinutes: invalidWindowMinutes
        );

        // Act
        var isValid = query.IsValid(out var errorMessage);

        // Assert
        Assert.False(isValid);
        Assert.Equal($"Window minutes must be between 1 and {GetCampaignMetricsQuery.MaxWindowMinutes}", errorMessage);
    }

    [Fact]
    public void IsValid_WithTooLargeWindowMinutes_ReturnsFalse()
    {
        // Arrange
        var query = new GetCampaignMetricsQuery(
            CampaignId: Guid.NewGuid(),
            TenantId: Guid.NewGuid(),
            WindowMinutes: GetCampaignMetricsQuery.MaxWindowMinutes + 1
        );

        // Act
        var isValid = query.IsValid(out var errorMessage);

        // Assert
        Assert.False(isValid);
        Assert.Equal($"Window minutes must be between 1 and {GetCampaignMetricsQuery.MaxWindowMinutes}", errorMessage);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(60)]
    [InlineData(360)]
    [InlineData(720)]
    [InlineData(1440)] // Max allowed
    public void IsValid_WithValidWindowMinutes_ReturnsTrue(int validWindowMinutes)
    {
        // Arrange
        var query = new GetCampaignMetricsQuery(
            CampaignId: Guid.NewGuid(),
            TenantId: Guid.NewGuid(),
            WindowMinutes: validWindowMinutes
        );

        // Act
        var isValid = query.IsValid(out var errorMessage);

        // Assert
        Assert.True(isValid);
        Assert.Null(errorMessage);
    }

    [Fact]
    public void GetWindowStart_ReturnsCorrectDateTime()
    {
        // Arrange
        var windowMinutes = 120;
        var query = new GetCampaignMetricsQuery(
            CampaignId: Guid.NewGuid(),
            TenantId: Guid.NewGuid(),
            WindowMinutes: windowMinutes
        );
        var beforeCall = DateTime.UtcNow.AddMinutes(-windowMinutes);

        // Act
        var windowStart = query.GetWindowStart();

        // Assert
        var afterCall = DateTime.UtcNow.AddMinutes(-windowMinutes);
        
        // Window start should be within reasonable range of expected time
        Assert.True(windowStart >= beforeCall.AddSeconds(-1));
        Assert.True(windowStart <= afterCall.AddSeconds(1));
    }

    [Fact]
    public void Record_EqualityWorks()
    {
        // Arrange
        var id1 = Guid.NewGuid();
        var id2 = Guid.NewGuid();

        var query1 = new GetCampaignMetricsQuery(id1, id2, 60, true);
        var query2 = new GetCampaignMetricsQuery(id1, id2, 60, true);
        var query3 = new GetCampaignMetricsQuery(id1, id2, 120, true); // Different window

        // Act & Assert
        Assert.Equal(query1, query2);
        Assert.NotEqual(query1, query3);
        Assert.Equal(query1.GetHashCode(), query2.GetHashCode());
    }

    [Fact]
    public void Constructor_DefaultValues_AreCorrect()
    {
        // Arrange & Act
        var query = new GetCampaignMetricsQuery(
            Guid.NewGuid(),
            Guid.NewGuid()
        );

        // Assert
        Assert.Equal(60, query.WindowMinutes);
        Assert.True(query.IncludeTimeseries);
    }
}

/// <summary>
/// Unit tests for TimeSeriesPoint creation and conversion
/// </summary>
public class TimeSeriesPointTests
{
    [Fact]
    public void FromMinuteMetrics_ConvertsCorrectly()
    {
        // Arrange
        var bucketTime = DateTime.UtcNow;
        var minuteMetrics = new ProductivityHub.Api.Models.CampaignMetricsMinute
        {
            CampaignId = Guid.NewGuid(),
            TenantId = Guid.NewGuid(),
            BucketMinute = bucketTime,
            Attempted = 100,
            Delivered = 95,
            Failed = 5,
            Open = 40,
            Click = 12,
            UpdatedAt = DateTime.UtcNow
        };

        // Act
        var timeSeriesPoint = TimeSeriesPoint.FromMinuteMetrics(minuteMetrics);

        // Assert
        Assert.Equal(bucketTime, timeSeriesPoint.T);
        Assert.Equal(100, timeSeriesPoint.Attempted);
        Assert.Equal(95, timeSeriesPoint.Delivered);
        Assert.Equal(5, timeSeriesPoint.Failed);
        Assert.Equal(40, timeSeriesPoint.Open);
        Assert.Equal(12, timeSeriesPoint.Click);
    }

    [Fact]
    public void FromMinuteMetrics_WithZeroValues_HandlesCorrectly()
    {
        // Arrange
        var bucketTime = DateTime.UtcNow;
        var minuteMetrics = new ProductivityHub.Api.Models.CampaignMetricsMinute
        {
            CampaignId = Guid.NewGuid(),
            TenantId = Guid.NewGuid(),
            BucketMinute = bucketTime,
            Attempted = 0,
            Delivered = 0,
            Failed = 0,
            Open = 0,
            Click = 0,
            UpdatedAt = DateTime.UtcNow
        };

        // Act
        var timeSeriesPoint = TimeSeriesPoint.FromMinuteMetrics(minuteMetrics);

        // Assert
        Assert.Equal(bucketTime, timeSeriesPoint.T);
        Assert.Equal(0, timeSeriesPoint.Attempted);
        Assert.Equal(0, timeSeriesPoint.Delivered);
        Assert.Equal(0, timeSeriesPoint.Failed);
        Assert.Equal(0, timeSeriesPoint.Open);
        Assert.Equal(0, timeSeriesPoint.Click);
    }
}