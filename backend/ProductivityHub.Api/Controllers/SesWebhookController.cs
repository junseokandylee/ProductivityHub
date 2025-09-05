using Microsoft.AspNetCore.Mvc;
using ProductivityHub.Api.Services;
using ProductivityHub.Api.Configuration;
using Microsoft.Extensions.Options;
using System.Security.Cryptography;
using System.Text;

namespace ProductivityHub.Api.Controllers;

[ApiController]
[Route("webhooks")]
public class SesWebhookController : ControllerBase
{
    private readonly IEmailService _emailService;
    private readonly AwsSesConfiguration _sesConfig;
    private readonly ILogger<SesWebhookController> _logger;

    public SesWebhookController(
        IEmailService emailService,
        IOptions<AwsSesConfiguration> sesConfig,
        ILogger<SesWebhookController> logger)
    {
        _emailService = emailService;
        _sesConfig = sesConfig.Value;
        _logger = logger;
    }

    [HttpPost("ses")]
    public async Task<IActionResult> HandleSesWebhook()
    {
        try
        {
            // Read the request body
            using var reader = new StreamReader(Request.Body);
            var payload = await reader.ReadToEndAsync();

            if (string.IsNullOrEmpty(payload))
            {
                _logger.LogWarning("Empty SES webhook payload received");
                return BadRequest("Empty payload");
            }

            // Verify the webhook signature if configured
            if (!string.IsNullOrEmpty(_sesConfig.WebhookSecret))
            {
                var signature = Request.Headers["X-Ses-Signature"].FirstOrDefault();
                if (string.IsNullOrEmpty(signature) || !VerifySignature(payload, signature, _sesConfig.WebhookSecret))
                {
                    _logger.LogWarning("Invalid SES webhook signature");
                    return Unauthorized("Invalid signature");
                }
            }

            // Process the SES webhook
            await _emailService.ProcessSesWebhookAsync(payload);

            _logger.LogDebug("SES webhook processed successfully");
            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing SES webhook");
            return StatusCode(500, "Internal server error");
        }
    }

    private bool VerifySignature(string payload, string signature, string secret)
    {
        try
        {
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
            var computedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
            var computedSignature = Convert.ToBase64String(computedHash);
            
            return signature == computedSignature;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying webhook signature");
            return false;
        }
    }

    [HttpGet("ses/health")]
    public IActionResult HealthCheck()
    {
        return Ok(new { status = "healthy", timestamp = DateTime.UtcNow });
    }
}