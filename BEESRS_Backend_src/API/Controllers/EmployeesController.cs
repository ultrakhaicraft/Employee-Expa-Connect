using System.Collections.Generic;
using API.Response;
using Application.Interfaces;
using Infrastructure.Models.Employe;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers
{

        [ApiController]
        [Route("api/admin/employees")]
        [Authorize(Roles = "Admin")]
        public class EmployeesController : ControllerBase
        {
            private readonly IEmployeeService _svc;

            public EmployeesController(IEmployeeService svc)
            {
                _svc = svc;
            }

            [HttpPost]
            public async Task<ActionResult<ApiResponse<EmployeeDto>>> Create([FromBody] CreateEmployeeDto dto)
            {
                if (!ModelState.IsValid)
                {
                    var bad = ApiResponse<EmployeeDto>.FailResult("Validation failed", ModelState);
                    bad.TraceId = HttpContext.TraceIdentifier;
                    return BadRequest(bad);
                }

                try
                {
                    var created = await _svc.CreateAsync(dto);
                    var ok = ApiResponse<EmployeeDto>.SuccessResult(created, "Created");
                    ok.TraceId = HttpContext.TraceIdentifier;
                    // Có thể trả 201 Created:
                    return Created($"api/admin/employees/{created.EmployeeId}/{created.EmployeeCode}", ok);
                }
                catch (InvalidOperationException ex)
                {
                    var fail = ApiResponse<EmployeeDto>.FailResult(ex.Message);
                    fail.TraceId = HttpContext.TraceIdentifier;
                    return BadRequest(fail);
                }
            }

            [HttpPost("bulk")]
            public async Task<ActionResult<ApiResponse<object>>> Bulk([FromBody] BulkCreateEmployeeDto dto)
            {
                if (!ModelState.IsValid)
                {
                    var bad = ApiResponse<object>.FailResult("Validation failed", ModelState);
                    bad.TraceId = HttpContext.TraceIdentifier;
                    return BadRequest(bad);
                }

                var created = await _svc.BulkCreateAsync(dto);
                var ok = ApiResponse<object>.SuccessResult(new { created }, "Bulk created");
                ok.TraceId = HttpContext.TraceIdentifier;
                return Ok(ok);
            }

            [HttpGet("{employeeId}/{employeeCode}")]
            public async Task<ActionResult<ApiResponse<EmployeeDto>>> Get(string employeeId, string employeeCode)
            {
                var item = await _svc.GetAsync(employeeId, employeeCode);
                if (item is null)
                {
                    var notf = ApiResponse<EmployeeDto>.FailResult("Employee entry not found");
                    notf.TraceId = HttpContext.TraceIdentifier;
                    return NotFound(notf);
                }

                var ok = ApiResponse<EmployeeDto>.SuccessResult(item);
                ok.TraceId = HttpContext.TraceIdentifier;
                return Ok(ok);
            }

            [HttpGet]
            public async Task<ActionResult<ApiResponse<PagedResult<EmployeeDto>>>> List([FromQuery] EmployeeQuery q)
            {
                var page = await _svc.ListAsync(q);
                var ok = ApiResponse<PagedResult<EmployeeDto>>.SuccessResult(page);
                ok.TraceId = HttpContext.TraceIdentifier;
                return Ok(ok);
            }

            [HttpDelete("{employeeId}/{employeeCode}")]
            public async Task<ActionResult<ApiResponse<object>>> Delete(string employeeId, string employeeCode)
            {
                var deleted = await _svc.DeleteAsync(employeeId, employeeCode);
                if (!deleted)
                {
                    var notf = ApiResponse<object>.FailResult("Employee entry not found");
                    notf.TraceId = HttpContext.TraceIdentifier;
                    return NotFound(notf);
                }

                var ok = ApiResponse<object>.SuccessResult(new { deleted = true }, "Deleted");
                ok.TraceId = HttpContext.TraceIdentifier;
                return Ok(ok);
            }

            [HttpDelete("expired")]
            public async Task<ActionResult<ApiResponse<object>>> DeleteExpired()
            {
                var removed = await _svc.DeleteExpiredAsync();
                var ok = ApiResponse<object>.SuccessResult(new { removed }, "Expired entries removed");
                ok.TraceId = HttpContext.TraceIdentifier;
                return Ok(ok);
            }

        [HttpPut]
        public async Task<ActionResult<ApiResponse<EmployeeDto>>> Upsert([FromBody] UpsertEmployeeDto dto)
        {
            if (!ModelState.IsValid)
            {
                var bad = ApiResponse<EmployeeDto>.FailResult("Validation failed", ModelState);
                bad.TraceId = HttpContext.TraceIdentifier;
                return BadRequest(bad);
            }

            try
            {
                var (res, created) = await _svc.UpsertAsync(dto);
                var msg = created ? "Created" : "Updated";

                var ok = ApiResponse<EmployeeDto>.SuccessResult(res, msg);
                ok.TraceId = HttpContext.TraceIdentifier;

                if (created)
                    return Created($"api/admin/employees/{res.EmployeeId}/{res.EmployeeCode}", ok);

                return Ok(ok);
            }
            catch (ArgumentException ex)
            {
                var fail = ApiResponse<EmployeeDto>.FailResult("Invalid payload", new List<string> { ex.Message });
                fail.TraceId = HttpContext.TraceIdentifier;
                return BadRequest(fail);
            }
        }

        [AllowAnonymous]
            [HttpGet("is-valid/code/{employeeCode}")]
            public async Task<ActionResult<ApiResponse<bool>>> IsValidByCode(string employeeCode)
            {
                var isValid = await _svc.IsValidByCodeAsync(employeeCode);
                var ok = ApiResponse<bool>.SuccessResult(isValid);
                ok.TraceId = HttpContext.TraceIdentifier;
                return Ok(ok);
            }

            [AllowAnonymous]
            [HttpGet("is-valid/{employeeId}/{employeeCode}")]
            public async Task<ActionResult<ApiResponse<bool>>> IsValid(string employeeId, string employeeCode)
            {
                var isValid = await _svc.IsValidAsync(employeeId, employeeCode);
                var ok = ApiResponse<bool>.SuccessResult(isValid);
                ok.TraceId = HttpContext.TraceIdentifier;
                return Ok(ok);
            }

            [HttpGet("codes")]
            public async Task<ActionResult<ApiResponse<IReadOnlyList<string>>>> GetRegisteredCodes([FromQuery] Domain.Enums.EmployeeStatus? status = null)
            {
                var codes = await _svc.GetRegisteredEmployeeCodesAsync(status);
                var ok = ApiResponse<IReadOnlyList<string>>.SuccessResult(codes, $"Found {codes.Count} registered employee code(s)");
                ok.TraceId = HttpContext.TraceIdentifier;
                return Ok(ok);
            }
        }
}
