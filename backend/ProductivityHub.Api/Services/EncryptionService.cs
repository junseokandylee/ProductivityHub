using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace ProductivityHub.Api.Services;

public interface IEncryptionService
{
    Task<byte[]> EncryptAsync(string plainText);
    Task<string?> DecryptAsync(byte[]? encryptedData);
    Task<byte[]> HashAsync(string value);
    string NormalizePhone(string phone);
    string NormalizeEmail(string email);
    string NormalizeKakaoId(string kakaoId);
}

public class EncryptionService : IEncryptionService
{
    private readonly IConfiguration _configuration;
    private readonly string _cryptoKey;

    public EncryptionService(IConfiguration configuration)
    {
        _configuration = configuration;
        _cryptoKey = _configuration["Encryption:Key"] ?? "default-key-please-change-in-production";
        
        if (_cryptoKey == "default-key-please-change-in-production")
        {
            throw new InvalidOperationException("Please set a proper encryption key in configuration");
        }
    }

    public async Task<byte[]> EncryptAsync(string plainText)
    {
        if (string.IsNullOrEmpty(plainText))
            return Array.Empty<byte>();

        try
        {
            using var aes = Aes.Create();
            aes.Key = GetKeyBytes(_cryptoKey);
            aes.GenerateIV();

            using var encryptor = aes.CreateEncryptor();
            using var msEncrypt = new MemoryStream();
            
            // Write IV first
            await msEncrypt.WriteAsync(aes.IV, 0, aes.IV.Length);
            
            using (var csEncrypt = new CryptoStream(msEncrypt, encryptor, CryptoStreamMode.Write))
            using (var swEncrypt = new StreamWriter(csEncrypt))
            {
                await swEncrypt.WriteAsync(plainText);
            }
            
            return msEncrypt.ToArray();
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException("Encryption failed", ex);
        }
    }

    public async Task<string?> DecryptAsync(byte[]? encryptedData)
    {
        if (encryptedData == null || encryptedData.Length == 0)
            return null;

        try
        {
            using var aes = Aes.Create();
            aes.Key = GetKeyBytes(_cryptoKey);

            using var msDecrypt = new MemoryStream(encryptedData);
            
            // Read IV first
            var iv = new byte[aes.BlockSize / 8];
            await msDecrypt.ReadAsync(iv, 0, iv.Length);
            aes.IV = iv;

            using var decryptor = aes.CreateDecryptor();
            using var csDecrypt = new CryptoStream(msDecrypt, decryptor, CryptoStreamMode.Read);
            using var srDecrypt = new StreamReader(csDecrypt);
            
            return await srDecrypt.ReadToEndAsync();
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException("Decryption failed", ex);
        }
    }

    public async Task<byte[]> HashAsync(string value)
    {
        if (string.IsNullOrEmpty(value))
            return Array.Empty<byte>();

        return await Task.FromResult(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
    }

    public string NormalizePhone(string phone)
    {
        if (string.IsNullOrWhiteSpace(phone))
            return phone;

        // Remove all non-digit characters
        var digitsOnly = Regex.Replace(phone, @"[^\d]", "");
        
        // Convert to standard Korean format (remove country code if present)
        if (digitsOnly.StartsWith("82") && digitsOnly.Length == 12)
        {
            digitsOnly = "0" + digitsOnly[2..]; // Remove 82 and add 0
        }
        
        return digitsOnly;
    }

    public string NormalizeEmail(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return email;

        return email.Trim().ToLowerInvariant();
    }

    public string NormalizeKakaoId(string kakaoId)
    {
        if (string.IsNullOrWhiteSpace(kakaoId))
            return kakaoId;

        return kakaoId.Trim().ToLowerInvariant();
    }

    private static byte[] GetKeyBytes(string key)
    {
        // Generate a consistent 256-bit key from the provided key string
        using var sha256 = SHA256.Create();
        return sha256.ComputeHash(Encoding.UTF8.GetBytes(key));
    }
}