using Application.Interfaces;
using AutoMapper;
using AutoMapper.Configuration.Annotations;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Helper.Enum;
using Infrastructure.Interfaces;
using Infrastructure.Models.Auth;
using Infrastructure.Models.Common;
using Infrastructure.Models.DTOs;
using Infrastructure.Models.UserDTO;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace Application.Services
{
    public class AuthService : IAuthService
    {
        private readonly IUserRepository _userRepository;
        private readonly IUserSessionRepository _sessionRepository;
        private readonly IPasswordResetTokenRepository _passwordResetRepository;
        private readonly IUserProfileRepository _userProfileRepository;
        private readonly IUserPreferenceRepository _userPreferenceRepository;
        private readonly IBranchRepository _branchRepository;
        private readonly ITokenService _tokenService;
        private readonly IEmailService _emailService;
        private readonly IMapper _mapper;
        private readonly IPasswordHasher<User> _passwordHasher;
        private readonly IMemoryCache _memoryCache;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ILogger<AuthService> _logger;
        private readonly IEmployeeRepository _employeeRepository;

        public AuthService(
            IUserRepository userRepository,
            IUserSessionRepository sessionRepository,
            IPasswordResetTokenRepository passwordResetRepository,
                        IUserProfileRepository userProfileRepository,
            IUserPreferenceRepository userPreferenceRepository,
            ITokenService tokenService,
            IEmailService emailService,
            IMapper mapper,
            IPasswordHasher<User> passwordHasher,
            IMemoryCache memoryCache,
            IHttpContextAccessor httpContextAccessor,
            IBranchRepository branchRepository,
			ILogger<AuthService> logger,IEmployeeRepository employeeRepository)
        {
            _userRepository = userRepository;
            _sessionRepository = sessionRepository;
            _passwordResetRepository = passwordResetRepository;
            _userProfileRepository = userProfileRepository;
            _userPreferenceRepository = userPreferenceRepository;
            _branchRepository = branchRepository;
			_tokenService = tokenService;
            _emailService = emailService;
            _mapper = mapper;
            _passwordHasher = passwordHasher;
            _memoryCache = memoryCache;
            _httpContextAccessor = httpContextAccessor;
            _logger = logger;
            _employeeRepository = employeeRepository;
        }

        public async Task<ApiResponse<string>> ChangePasswordAsync(ChangePasswordDto dto)
        {
            try
            {
                var user = await _userRepository.GetByIdAsync(dto.UserId);
                if (user == null || !user.IsActive)
                    return ApiResponse<string>.ErrorResultWithCode("User not found or inactive", (int) ResponseCode.NotFound);

                var verify = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, dto.CurrentPassword);
                if (verify == PasswordVerificationResult.Failed)
                    return ApiResponse<string>.ErrorResultWithCode("Current password is incorrect", (int)ResponseCode.BadRequest);

                user.PasswordHash = _passwordHasher.HashPassword(user, dto.NewPassword);
                user.FailedLoginAttempts = 0;
                await _userRepository.UpdateAsync(user);

                // Đăng xuất tất cả session cũ (khuyến nghị)
                await _sessionRepository.DeactivateAllUserSessionsAsync(user.UserId);

                await _emailService.SendPasswordChangedNotificationAsync(user.Email, user.FirstName);
                return ApiResponse<string>.SuccessResult("Password changed successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during password change for user {UserId}", dto.UserId);
                return ApiResponse<string>.ErrorResultWithCode("Failed to change password", (int)ResponseCode.InternalServerError);
            }
        }
        public async Task<ApiResponse<string>> ResendOtpAsync(ResendOtpDto dto)
        {
            try
            {
                var email = dto.Email.ToLowerInvariant();
                var user = await _userRepository.GetByEmailAsync(email);
                if (user == null) return ApiResponse<string>.ErrorResultWithCode("User not found", (int)ResponseCode.NotFound);
                if (user.EmailVerified) return ApiResponse<string>.ErrorResultWithCode("Email already verified", (int)ResponseCode.BadRequest);

                var key = OtpKey("email_verify", email);
                if (!_memoryCache.TryGetValue(key, out OtpEntry? entry))
                    entry = new OtpEntry { Purpose = "email_verify" };

                if (entry.LastSent.HasValue &&
                    (DateTimeOffset.UtcNow - entry.LastSent.Value).TotalSeconds < OTP_RESEND_COOLDOWN_SECONDS)
                    return ApiResponse<string>.ErrorResultWithCode("Please wait a moment before requesting another code", (int)ResponseCode.BadRequest);

                if (entry.ResendCount >= OTP_MAX_RESEND)
                    return ApiResponse<string>.ErrorResultWithCode("You have reached the resend limit. Try again later.", (int)ResponseCode.BadRequest);

                entry.Code = GenerateOtpCodeSecure();
                entry.ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(OTP_TTL_MINUTES);
                entry.LastSent = DateTimeOffset.UtcNow;
                entry.ResendCount += 1;

                _memoryCache.Set(key, entry, entry.ExpiresAt);

                await _emailService.SendVerificationEmailAsync(email, entry.Code);
                _logger.LogInformation("Resent email-verify OTP to {Email}", email);

                return ApiResponse<string>.SuccessResult("Verification code has been resent");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during resend OTP");
                return ApiResponse<string>.ErrorResultWithCode("Failed to resend OTP", (int)ResponseCode.InternalServerError);
            }
        }
        public async Task<ApiResponse<string>> RegisterAsync(RegisterDto registerDto)
        {
            try
            {
                // Validate email and employee ID uniqueness (normalize email first)
                var normalizedEmail = registerDto.Email.Trim().ToLowerInvariant();
                if (await _userRepository.EmailExistsAsync(normalizedEmail))
                {
                    return ApiResponse<string>.ErrorResultWithCode("Email already exists", (int)ResponseCode.BadRequest);
                }

                if (string.IsNullOrWhiteSpace(registerDto.EmployeeCode))
                    return ApiResponse<string>.ErrorResultWithCode("EmployeeCode is required", (int)ResponseCode.BadRequest);

                // Chỉ cho phép đăng ký với EmployeeCode có Status = Inactive
                var emp = await _employeeRepository.GetInactiveByCodeAsync(registerDto.EmployeeCode);
                if (emp is null)
                    return ApiResponse<string>.ErrorResultWithCode(
                        "Employee code is invalid or has already been used",
                        (int)ResponseCode.BadRequest);

                // Email đăng ký phải trùng với email trong bảng Employee (so sánh case-insensitive)
                if (emp.Email != normalizedEmail)
                    return ApiResponse<string>.ErrorResultWithCode("Your email must match with email from your company!", (int)ResponseCode.BadRequest);


                if (await _userRepository.EmployeeIdExistsAsync(emp.EmployeeId))
                    return ApiResponse<string>.ErrorResultWithCode("Employee ID already exists", (int)ResponseCode.BadRequest);

                var user = new User
                {
                    Email = normalizedEmail,
                    EmployeeId = emp.EmployeeId,                 // <-- lấy từ DB
                    FirstName = registerDto.FirstName,
                    LastName = registerDto.LastName,
                    CurrentBranchId = emp.BranchId,
                    JobTitle = emp.JobTitle,                     // <-- lấy từ Employee, không cần nhập
                    PhoneNumber = registerDto.PhoneNumber,
                    RoleId = 3, // User
                    EmailVerified = false,
                    IsActive = true
                };
                user.PasswordHash = _passwordHasher.HashPassword(user, registerDto.Password);

                var createdUser = await _userRepository.CreateAsync(user);

                // Sau khi đăng ký thành công, set Status = Active để không thể dùng lại
                await _employeeRepository.UpdateEmployeeStatusAsync(emp.EmployeeId, emp.EmployeeCode, EmployeeStatus.Active);

                // 5) Gửi OTP như cũ
                var otpCode = GenerateOtpCodeSecure();
                var entry = new OtpEntry
                {
                    Code = otpCode,
                    Purpose = "email_verify",
                    ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(OTP_TTL_MINUTES),
                    LastSent = DateTimeOffset.UtcNow,
                    ResendCount = 0,
                    Attempts = 0
                };
                // Sử dụng normalized email cho OTP key để đảm bảo consistency
                _memoryCache.Set(OtpKey("email_verify", normalizedEmail), entry, entry.ExpiresAt);
                await _emailService.SendVerificationEmailAsync(normalizedEmail, otpCode);

                _logger.LogInformation("User registered successfully: {Email}", registerDto.Email);
                return ApiResponse<string>.SuccessResult("Registration successful. Please check your email for verification code.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during user registration: {Email}", registerDto.Email);
                return ApiResponse<string>.ErrorResultWithCode("Registration failed. Please try again.", (int)ResponseCode.InternalServerError);
            }
        }

        public async Task<ApiResponse<AuthResponseDto>> LoginAsync(LoginDto loginDto)
        {
            try
            {
                var user = await _userRepository.GetByEmailAsync(loginDto.Email.ToLowerInvariant());

                if (user == null || !user.IsActive)
                {
                    await Task.Delay(500); // Prevent timing attacks
                    return ApiResponse<AuthResponseDto>.ErrorResultWithCode("Invalid email or password", (int)ResponseCode.BadRequest);
                }

                // Check failed login attempts (simple lockout mechanism)
                if (user.FailedLoginAttempts >= 5)
                {
                    var lockoutTime = user.UpdatedAt.AddMinutes(30);
                    if (DateTimeOffset.UtcNow < lockoutTime)
                    {
                        return ApiResponse<AuthResponseDto>.ErrorResultWithCode(
                            "Account locked due to multiple failed login attempts. Please try again later.", (int)ResponseCode.BadRequest);
                    }

                    // Reset failed attempts after lockout period
                    user.FailedLoginAttempts = 0;
                }

                var result = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, loginDto.Password);

                if (result == PasswordVerificationResult.Failed)
                {
                    user.FailedLoginAttempts++;
                    await _userRepository.UpdateAsync(user);

                    return ApiResponse<AuthResponseDto>.ErrorResultWithCode("Invalid email or password", (int)ResponseCode.BadRequest);
                }

                // Check if email is verified
                if (!user.EmailVerified)
                {
                    return ApiResponse<AuthResponseDto>.ErrorResultWithCode(
                        "Please verify your email before logging in.", (int)ResponseCode.InternalServerError);
                }

                // Reset failed attempts on successful login
                user.FailedLoginAttempts = 0;
                user.LastLoginAt = DateTimeOffset.UtcNow;
                await _userRepository.UpdateAsync(user);

                // Generate tokens
                var accessToken = _tokenService.GenerateAccessToken(user);
                var refreshToken = _tokenService.GenerateRefreshToken();
                var rolename = user.Role.RoleName;
                var timeZone = user.UserProfile?.Timezone ?? "UTC";
                // Create session with device info and IP address
                var session = new UserSession
                {
                    UserId = user.UserId,
                    TokenHash = _tokenService.HashToken(accessToken),
                    RefreshTokenHash = _tokenService.HashToken(refreshToken),
                    DeviceInfo = GetDeviceInfo(),
                    IpAddress = GetClientIpAddress(),
                    ExpiresAt = DateTimeOffset.UtcNow.AddHours(24),
                    IsActive = true
                };

                await _sessionRepository.CreateAsync(session);

                var userInfo = _mapper.Map<UserInfoDto>(user);

                var authResponse = new AuthResponseDto
                {
                    AccessToken = accessToken,
                    RefreshToken = refreshToken,
                    ExpiresAt = session.ExpiresAt.DateTime,
                    roleName = rolename,
                    Timezone = timeZone,
                    //User = userInfo
                };

                _logger.LogInformation("User logged in successfully: {Email}", loginDto.Email);

                return ApiResponse<AuthResponseDto>.SuccessResult(authResponse, "Login successful");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during login: {Email}", loginDto.Email);
                return ApiResponse<AuthResponseDto>.ErrorResultWithCode("Login failed. Please try again.", (int)ResponseCode.InternalServerError);
            }
        }

        public async Task<ApiResponse<string>> VerifyEmailAsync(EmailVerificationDto verificationDto)
        {
            try
            {
                var email = verificationDto.Email.ToLowerInvariant();
                var key = OtpKey("email_verify", email);

                if (!_memoryCache.TryGetValue(key, out OtpEntry? entry))
                    return ApiResponse<string>.ErrorResultWithCode("Verification code expired or not found", (int)ResponseCode.BadRequest);

                if (entry.ExpiresAt <= DateTimeOffset.UtcNow)
                    return ApiResponse<string>.ErrorResultWithCode("Verification code has expired", (int)ResponseCode.BadRequest);

                if (entry.Attempts >= OTP_MAX_ATTEMPTS)
                    return ApiResponse<string>.ErrorResultWithCode("Too many incorrect attempts. Please request a new code.", (int)ResponseCode.BadRequest);

                if (!string.Equals(entry.Code, verificationDto.OtpCode, StringComparison.Ordinal))
                {
                    entry.Attempts += 1;
                    _memoryCache.Set(key, entry, entry.ExpiresAt);
                    return ApiResponse<string>.ErrorResultWithCode("Invalid verification code", (int)ResponseCode.BadRequest);
                }

                var user = await _userRepository.GetByEmailAsync(email);
                if (user == null) return ApiResponse<string>.ErrorResultWithCode("User not found", (int)ResponseCode.NotFound);
                if (user.EmailVerified) return ApiResponse<string>.ErrorResultWithCode("Email already verified", (int)ResponseCode.BadRequest);

                user.EmailVerified = true;
                await _userRepository.UpdateAsync(user);

                _memoryCache.Remove(key);
                await _emailService.SendWelcomeEmailAsync(user.Email, $"{user.FirstName} {user.LastName}");

                _logger.LogInformation("Email verified successfully: {Email}", verificationDto.Email);
                return ApiResponse<string>.SuccessResult("Email verified successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during email verification: {Email}", verificationDto.Email);
                return ApiResponse<string>.ErrorResultWithCode("Email verification failed. Please try again.", (int)ResponseCode.InternalServerError);
            }
        }

        public async Task<ApiResponse<AuthResponseDto>> RefreshTokenAsync(string refreshToken)
        {
            try
            {
                var refreshTokenHash = _tokenService.HashToken(refreshToken);
                var session = await _sessionRepository.GetByRefreshTokenHashAsync(refreshTokenHash);

                if (session == null || !session.IsActive || session.ExpiresAt <= DateTimeOffset.UtcNow)
                {
                    return ApiResponse<AuthResponseDto>.ErrorResultWithCode("Invalid or expired refresh token", (int)ResponseCode.BadRequest);
                }

                var user = session.User;

                if (!user.IsActive || !user.EmailVerified)
                {
                    await _sessionRepository.DeactivateSessionAsync(session.SessionId);
                    return ApiResponse<AuthResponseDto>.ErrorResultWithCode("User account is not active", (int)ResponseCode.BadRequest);
                }

                // Generate new tokens
                var newAccessToken = _tokenService.GenerateAccessToken(user);
                var newRefreshToken = _tokenService.GenerateRefreshToken();

                // Update session
                session.TokenHash = _tokenService.HashToken(newAccessToken);
                session.RefreshTokenHash = _tokenService.HashToken(newRefreshToken);
                session.LastActivityAt = DateTimeOffset.UtcNow;
                session.ExpiresAt = DateTimeOffset.UtcNow.AddHours(24);

                await _sessionRepository.UpdateAsync(session);

                var userInfo = _mapper.Map<UserInfoDto>(user);

                var authResponse = new AuthResponseDto
                {
                    AccessToken = newAccessToken,
                    RefreshToken = newRefreshToken,
                    ExpiresAt = session.ExpiresAt.DateTime,
                    //User = userInfo
                };

                return ApiResponse<AuthResponseDto>.SuccessResult(authResponse, "Token refreshed successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during token refresh");
                return ApiResponse<AuthResponseDto>.ErrorResultWithCode("Token refresh failed. Please login again.", (int)ResponseCode.InternalServerError);
            }
        }

        public async Task<ApiResponse<string>> LogoutAsync(string accessToken)
        {
            try
            {
                var tokenHash = _tokenService.HashToken(accessToken);
                var session = await _sessionRepository.GetByTokenHashAsync(tokenHash);

                if (session != null)
                {
                    await _sessionRepository.DeactivateSessionAsync(session.SessionId);
                }

                return ApiResponse<string>.SuccessResult("Logged out successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during logout");
                return ApiResponse<string>.ErrorResultWithCode("Logout failed", (int)ResponseCode.InternalServerError);
            }
        }

        public async Task<ApiResponse<string>> ForgotPasswordAsync(ForgotPasswordDto forgotPasswordDto)
        {
            try
            {
                var user = await _userRepository.GetByEmailAsync(forgotPasswordDto.Email.ToLowerInvariant());

                if (user == null)
                {
                    // Don't reveal if email exists or not for security reasons
                    await Task.Delay(500); // Simulate processing time
                    return ApiResponse<string>.SuccessResult(
                        "If your email is registered, you will receive a password reset link shortly.");
                }

                if (!user.IsActive)
                {
                    return ApiResponse<string>.ErrorResultWithCode("Account is not active", (int)ResponseCode.BadRequest);
                }

                // Invalidate any existing reset tokens for this user
                await _passwordResetRepository.InvalidateAllUserTokensAsync(user.UserId);

                // Generate password reset token
                var resetToken = GenerateSecureToken();
                var tokenHash = _tokenService.HashToken(resetToken);

                var passwordResetToken = new PasswordResetToken
                {
                    UserId = user.UserId,
                    TokenHash = tokenHash,
                    ExpiresAt = DateTimeOffset.UtcNow.AddHours(1) // Token expires in 1 hour
                };

                await _passwordResetRepository.CreateAsync(passwordResetToken);
            
                // Send reset email (in a real implementation, you'd send the actual reset URL)
                var resetLink = $"http://localhost:5173/reset-password?token={resetToken}&email={user.Email}";
                await _emailService.SendPasswordResetEmailAsync(user.Email, user.FirstName, resetLink);

                _logger.LogInformation("Password reset requested for user: {Email}", forgotPasswordDto.Email);

                return ApiResponse<string>.SuccessResult(
                    "If your email is registered, you will receive a password reset link shortly.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during forgot password: {Email}", forgotPasswordDto.Email);
                return ApiResponse<string>.ErrorResultWithCode("Failed to process password reset request", (int)ResponseCode.BadRequest);
            }
        }

        public async Task<ApiResponse<string>> ResetPasswordAsync(ResetPasswordDto resetPasswordDto)
        {
            try
            {
                var tokenHash = _tokenService.HashToken(resetPasswordDto.Token);
                var resetToken = await _passwordResetRepository.GetValidTokenAsync(
                    tokenHash, resetPasswordDto.Email.ToLowerInvariant());

                if (resetToken == null)
                {
                    return ApiResponse<string>.ErrorResultWithCode("Invalid or expired reset token", (int)ResponseCode.BadRequest);
                }

                var user = resetToken.User;

                if (!user.IsActive)
                {
                    return ApiResponse<string>.ErrorResultWithCode("Account is not active", (int)ResponseCode.BadRequest);
                }

                // Update user password
                user.PasswordHash = _passwordHasher.HashPassword(user, resetPasswordDto.NewPassword);
                user.FailedLoginAttempts = 0; // Reset failed attempts
                await _userRepository.UpdateAsync(user);

                // Mark token as used
                await _passwordResetRepository.MarkTokenAsUsedAsync(resetToken.TokenId);

                // Deactivate all existing sessions for security
                await _sessionRepository.DeactivateAllUserSessionsAsync(user.UserId);

                // Send confirmation email
                await _emailService.SendPasswordChangedNotificationAsync(user.Email, user.FirstName);

                _logger.LogInformation("Password reset completed for user: {Email}", resetPasswordDto.Email);

                return ApiResponse<string>.SuccessResult("Password has been reset successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during password reset: {Email}", resetPasswordDto.Email);
                return ApiResponse<string>.ErrorResultWithCode("Failed to reset password", (int)ResponseCode.InternalServerError);
            }
        }

        #region Private Helper Methods

        private static string GenerateOtpCode()
        {
            var random = new Random();
            return random.Next(100000, 999999).ToString();
        }

        private static string GenerateSecureToken()
        {
            // Generate a cryptographically secure random token
            using var rng = System.Security.Cryptography.RandomNumberGenerator.Create();
            var bytes = new byte[32];
            rng.GetBytes(bytes);
            return Convert.ToBase64String(bytes).Replace("+", "-").Replace("/", "_").Replace("=", "");
        }

        private string GetDeviceInfo()
        {
            try
            {
                var httpContext = _httpContextAccessor.HttpContext;
                if (httpContext == null)
                {
                    return JsonSerializer.Serialize(new { Device = "Unknown", Platform = "Unknown" });
                }

                var userAgent = httpContext.Request.Headers["User-Agent"].ToString();
                var acceptLanguage = httpContext.Request.Headers["Accept-Language"].ToString();
                var acceptEncoding = httpContext.Request.Headers["Accept-Encoding"].ToString();

                var deviceInfo = new
                {
                    UserAgent = userAgent,
                    AcceptLanguage = acceptLanguage,
                    AcceptEncoding = acceptEncoding,
                    Timestamp = DateTimeOffset.UtcNow,
                    Platform = DeterminePlatform(userAgent),
                    Browser = DetermineBrowser(userAgent)
                };

                return JsonSerializer.Serialize(deviceInfo);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to extract device info");
                return JsonSerializer.Serialize(new { Device = "Unknown", Error = "Failed to extract" });
            }
        }

        private string GetClientIpAddress()
        {
            try
            {
                var httpContext = _httpContextAccessor.HttpContext;
                if (httpContext == null) return "Unknown";

                // Check for forwarded IP first (if behind proxy/load balancer)
                var forwardedFor = httpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault();
                if (!string.IsNullOrEmpty(forwardedFor))
                {
                    return forwardedFor.Split(',')[0].Trim();
                }

                var realIp = httpContext.Request.Headers["X-Real-IP"].FirstOrDefault();
                if (!string.IsNullOrEmpty(realIp))
                {
                    return realIp;
                }

                // Fallback to connection remote IP
                return httpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown";
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to extract client IP address");
                return "Unknown";
            }
        }

        private static string DeterminePlatform(string userAgent)
        {
            if (string.IsNullOrEmpty(userAgent)) return "Unknown";

            userAgent = userAgent.ToLower();

            if (userAgent.Contains("windows")) return "Windows";
            if (userAgent.Contains("macintosh") || userAgent.Contains("mac os x")) return "macOS";
            if (userAgent.Contains("linux")) return "Linux";
            if (userAgent.Contains("android")) return "Android";
            if (userAgent.Contains("iphone") || userAgent.Contains("ipad")) return "iOS";

            return "Unknown";
        }

        private static string DetermineBrowser(string userAgent)
        {
            if (string.IsNullOrEmpty(userAgent)) return "Unknown";

            userAgent = userAgent.ToLower();

            if (userAgent.Contains("edg")) return "Microsoft Edge";
            if (userAgent.Contains("chrome")) return "Google Chrome";
            if (userAgent.Contains("firefox")) return "Mozilla Firefox";
            if (userAgent.Contains("safari") && !userAgent.Contains("chrome")) return "Safari";
            if (userAgent.Contains("opera")) return "Opera";

            return "Unknown";
        }
        private sealed class OtpEntry
        {
            public string Code { get; set; } = default!;
            public DateTimeOffset ExpiresAt { get; set; }
            public int Attempts { get; set; } = 0;
            public int ResendCount { get; set; } = 0;
            public DateTimeOffset? LastSent { get; set; } = null;
            public string Purpose { get; set; } = "email_verify";
        }
        private static string OtpKey(string purpose, string email)
    => $"otp:{purpose}:{email.ToLowerInvariant()}";

        private const int OTP_TTL_MINUTES = 10;
        private const int OTP_MAX_ATTEMPTS = 5;
        private const int OTP_RESEND_COOLDOWN_SECONDS = 60;
        private const int OTP_MAX_RESEND = 3;

        // Sinh OTP an toàn (crypto)
        private static string GenerateOtpCodeSecure(int digits = 6)
        {
            var max = (int)Math.Pow(10, digits);
            var bytes = new byte[4];
            System.Security.Cryptography.RandomNumberGenerator.Fill(bytes);
            var value = BitConverter.ToUInt32(bytes, 0) % (uint)max;
            return value.ToString(new string('0', digits));
        }
        #endregion
    }
}