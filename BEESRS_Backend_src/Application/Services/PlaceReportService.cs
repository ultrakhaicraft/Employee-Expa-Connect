using Application.Interfaces;
using AutoMapper;
using Domain.Entities;
using Infrastructure.Configurations;
using Infrastructure.Interfaces;
using Infrastructure.Interfaces.IPlaceRepos;
using Infrastructure.Models.AdminManageModel;
using Infrastructure.Models.Common;
using Infrastructure.Models.PlaceDTO;
using Infrastructure.Repositories.PlaceRepos;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Services
{
    public class PlaceReportService : IPlaceReportService
    {
        private readonly IPlaceReportRepository _placeReportRepository;
        private readonly IUserRepository _userRepository;
        private readonly IPlaceRepository _placeRepository;
        private readonly IMapper _mapper;
        private readonly IUnitOfWork _unitOfWork;

        public PlaceReportService(IPlaceReportRepository placeReport, IUserRepository userRepository, IPlaceRepository placeRepository, IMapper mapper, IUnitOfWork unitOfWork)
        {
            _placeReportRepository = placeReport;
            _userRepository = userRepository;
            _placeRepository = placeRepository;
            _mapper = mapper;
            _unitOfWork = unitOfWork;
        }

        public async Task<int> CreateReport(string reason, Guid placeId, Guid userId)
        {
            var newReport = new PlaceReport
            {
                PlaceId = placeId,
                ReportedByUserId = userId,
                Reason = reason,
                ReportedAt = DateTimeOffset.UtcNow
            };

            return await _placeReportRepository.CreateReport(newReport);
        }

        public async Task<PagedResult<PlaceDetailForHome>> GetAllPlaceHaveReport(Guid moderatorId, OnlyPageRequest req)
        {
            var moderator = await _userRepository.GetUserWithDetailsAsync(moderatorId);
            if (moderator == null)
                throw new Exception("Cannot find this moderator.");

            var query = _placeReportRepository.GetAllPlaceHaveReport((Guid) moderator.CurrentBranchId);

            var totalCount = await query.CountAsync();

            var placeReports = await query
                .Skip((req.Page - 1) * req.PageSize)
                .Take(req.PageSize)
                .ToListAsync();

            var result = _mapper.Map<List<PlaceDetailForHome>>(placeReports);
            return new PagedResult<PlaceDetailForHome>(
                req.Page,
                req.PageSize,
                totalCount,
                result
                );
        }

        public async Task<List<PlaceReportDTO>> GetAllReportOfPlace(Guid placeId)
        {
            var placeReports = await _placeReportRepository.GetAllReportOfPlace(placeId);
            return _mapper.Map<List<PlaceReportDTO>>(placeReports);
        }

        public async Task ResolveAllReportOfPlace(Guid placeId, string resolvedNote, Guid moderatorId)
        {
            var transaction = await _unitOfWork.BeginTransactionAsync();
            try
            {
                var placeReports = await _placeReportRepository.GetAllReportOfPlace(placeId);
                if (placeReports.Count == 0)
                    throw new InvalidOperationException("Cannot found any report of this place.");

                foreach ( var placeReport in placeReports )
                {
                    if (placeReport.IsResolved)
                        throw new InvalidOperationException("This report is already resolved by someone else. Please refresh your page.");

                    placeReport.ResolvedNote = resolvedNote;
                    placeReport.ResolvedByUserId = moderatorId;
                    placeReport.ResolvedAt = DateTimeOffset.Now;
                    placeReport.IsResolved = true;

                    _placeReportRepository.UpdateReport(placeReport);
                }
                await _unitOfWork.SaveChangesAsync();

                if (transaction != null)
                    await _unitOfWork.CommitAsync();
            }
            catch
            {
                await _unitOfWork.RollbackAsync();
                throw;
            }
        }

        public async Task ResolveReport(ResolveReport resolveReport, Guid moderatorId)
        {
            var transaction = await _unitOfWork.BeginTransactionAsync();
            try
            {

                var placeReport = await _placeReportRepository.GetPlaceReportById(resolveReport.ReportId);
                if (placeReport == null)
                    throw new InvalidOperationException("Cannot find report!");

                if (placeReport.IsResolved)
                    throw new InvalidOperationException("This report is already resolved by someone else.");

                // If report is valid, remove place from system
                if (resolveReport.IsValid)
                {
                    var delResult = await _placeRepository.DeleteAsync(placeReport.PlaceId);
                    if (delResult == 0)
                        throw new Exception("Delete place failed!");
                }

                placeReport.ResolvedNote = resolveReport.ResolvedNote;
                placeReport.ResolvedByUserId = moderatorId;
                placeReport.ResolvedAt = DateTimeOffset.UtcNow;
                placeReport.IsResolved = true;

                _placeReportRepository.UpdateReport(placeReport);

                await _unitOfWork.SaveChangesAsync();

                if (transaction != null)
                    await _unitOfWork.CommitAsync();
            }
            catch
            {
                await _unitOfWork.RollbackAsync();
                throw;
            }
        }
    }
}
