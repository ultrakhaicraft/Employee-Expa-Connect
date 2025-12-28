using Application.Interfaces;
using Infrastructure.Helper.Enum;
using Infrastructure.Models.Auth;
using Infrastructure.Models.Common;
using Infrastructure.Models.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly ILogger<AuthController> _logger;

        public AuthController(IAuthService authService, ILogger<AuthController> logger)
        {
            _authService = authService;
            _logger = logger;
        }

        /// <summary>
        /// Register a new user account
        /// </summary>
        [HttpPost("register")]
        public async Task<ActionResult<ApiResponse<string>>> Register([FromBody] RegisterDto registerDto)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

                return BadRequest(ApiResponse<string>.ErrorResultWithCode("Validation failed", (int)ResponseCode.BadRequest, errors));
            }

            var result = await _authService.RegisterAsync(registerDto);

            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }

        /// <summary>
        /// Login user
        /// </summary>
        [HttpPost("login")]
        public async Task<ActionResult<ApiResponse<AuthResponseDto>>> Login([FromBody] LoginDto loginDto)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

                return BadRequest(ApiResponse<AuthResponseDto>.ErrorResultWithCode("Validation failed", (int)ResponseCode.BadRequest, errors));
            }

            var result = await _authService.LoginAsync(loginDto);

            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }

        /// <summary>
        /// Verify email with OTP code
        /// </summary>
        [HttpPost("verify-email")]
        public async Task<ActionResult<ApiResponse<string>>> VerifyEmail([FromBody] EmailVerificationDto verificationDto)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

                return BadRequest(ApiResponse<string>.ErrorResultWithCode("Validation failed", (int)ResponseCode.BadRequest, errors));
            }

            var result = await _authService.VerifyEmailAsync(verificationDto);

            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }

        /// <summary>
        /// Refresh access token
        /// </summary>
        [HttpPost("refresh-token")]
        public async Task<ActionResult<ApiResponse<AuthResponseDto>>> RefreshToken([FromBody] string refreshToken)
        {
            if (string.IsNullOrWhiteSpace(refreshToken))
            {
                return BadRequest(ApiResponse<AuthResponseDto>.ErrorResultWithCode("Refresh token is required", (int)ResponseCode.BadRequest));
            }

            var result = await _authService.RefreshTokenAsync(refreshToken);

            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }

        /// <summary>
        /// Logout user
        /// </summary>
        [HttpPost("logout")]
        [Authorize]
        public async Task<ActionResult<ApiResponse<string>>> Logout()
        {
            var authHeader = Request.Headers["Authorization"].FirstOrDefault();

            if (authHeader == null || !authHeader.StartsWith("Bearer "))
            {
                return BadRequest(ApiResponse<string>.ErrorResultWithCode("Invalid authorization header", (int)ResponseCode.BadRequest));
            }

            var accessToken = authHeader.Substring("Bearer ".Length).Trim();

            var result = await _authService.LogoutAsync(accessToken);

            return Ok(result);
        }

        
        [HttpPost("forgot-password")]
        public async Task<ActionResult<ApiResponse<string>>> ForgotPassword([FromBody] ForgotPasswordDto forgotPasswordDto)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

                return BadRequest(ApiResponse<string>.ErrorResultWithCode("Validation failed", (int)ResponseCode.BadRequest, errors));
            }

            var result = await _authService.ForgotPasswordAsync(forgotPasswordDto);

            return Ok(result); // Always return 200 for security reasons
        }

        /// <summary>
        /// Reset password with token
        /// </summary>
        [HttpPost("reset-password")]
        public async Task<ActionResult<ApiResponse<string>>> ResetPassword([FromBody] ResetPasswordDto resetPasswordDto)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

                return BadRequest(ApiResponse<string>.ErrorResultWithCode("Validation failed", (int)ResponseCode.BadRequest, errors));
            }

            var result = await _authService.ResetPasswordAsync(resetPasswordDto);

            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }

        /// <summary>
        /// Resend email verification OTP
        /// </summary>
        [HttpPost("resend-otp")]
        public async Task<ActionResult<ApiResponse<string>>> ResendOtp([FromBody] ResendOtpDto dto)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

                return BadRequest(ApiResponse<string>.ErrorResultWithCode("Validation failed", (int)ResponseCode.BadRequest, errors));
            }

            // Ép purpose về email_verify để tránh lạm dụng
            dto.Purpose = "email_verify";
            var result = await _authService.ResendOtpAsync(dto);

            if (!result.Success)
                return BadRequest(result);

            return Ok(result);
        }

        /// <summary>
        /// Change password (requires authentication)
        /// </summary>
        [HttpPost("change-password")]
        [Authorize]
        public async Task<ActionResult<ApiResponse<string>>> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

                return BadRequest(ApiResponse<string>.ErrorResultWithCode("Validation failed", (int)ResponseCode.BadRequest, errors));
            }

            // Lấy userId từ JWT, tránh tin vào body
            if (!TryGetUserIdFromClaims(out var userId))
                return BadRequest(ApiResponse<string>.ErrorResultWithCode("Invalid user ID in token", (int)ResponseCode.BadRequest));

            dto.UserId = userId;

            var result = await _authService.ChangePasswordAsync(dto);

            if (!result.Success)
                return BadRequest(result);

            return Ok(result);
        }

        /// <summary>
        /// Health check endpoint
        /// </summary>
        [HttpGet("health")]
        public IActionResult Health()
        {
            return Ok(new { Status = "Healthy", Timestamp = DateTime.UtcNow });
        }

        private bool TryGetUserIdFromClaims(out Guid userId)
        {
            userId = Guid.Empty;

            // Thử các claim phổ biến: NameIdentifier, "sub", "uid"
            var idStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                     ?? User.FindFirst("sub")?.Value
                     ?? User.FindFirst("uid")?.Value;

            return !string.IsNullOrWhiteSpace(idStr) && Guid.TryParse(idStr, out userId);
        }

    }
}
