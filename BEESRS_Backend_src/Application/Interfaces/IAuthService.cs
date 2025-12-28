using Infrastructure.Models.Auth;
using Infrastructure.Models.Common;
using Infrastructure.Models.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Interfaces
{
    public interface IAuthService
    {
        Task<ApiResponse<string>> RegisterAsync(RegisterDto registerDto);
        Task<ApiResponse<AuthResponseDto>> LoginAsync(LoginDto loginDto);
        Task<ApiResponse<string>> VerifyEmailAsync(EmailVerificationDto verificationDto);
        Task<ApiResponse<AuthResponseDto>> RefreshTokenAsync(string refreshToken);
        Task<ApiResponse<string>> LogoutAsync(string accessToken);
        Task<ApiResponse<string>> ForgotPasswordAsync(ForgotPasswordDto forgotPasswordDto);
        Task<ApiResponse<string>> ResetPasswordAsync(ResetPasswordDto resetPasswordDto);
        Task<ApiResponse<string>> ResendOtpAsync(ResendOtpDto dto);
        Task<ApiResponse<string>> ChangePasswordAsync(ChangePasswordDto dto);
    }
}
