using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Application.Exceptions;
using Application.Interfaces;
using Domain.Entities;
using Infrastructure.Interfaces;

namespace Application.Services
{
    public class VoteService : IVoteService
    {
        private readonly IEventVoteRepository _voteRepository;
        private readonly IEventPlaceOptionRepository _optionRepository;

        public VoteService(
            IEventVoteRepository voteRepository,
            IEventPlaceOptionRepository optionRepository)
        {
            _voteRepository = voteRepository;
            _optionRepository = optionRepository;
        }

        public async Task<bool> CastVoteAsync(Guid eventId, Guid optionId, Guid voterId, int voteValue, string comment = null)
        {
            // Verify the option exists
            var option = await _optionRepository.GetByIdAsync(optionId);

            if (option == null || option.EventId != eventId)
                throw new NotFoundException("Venue option not found");

            // Check if user already voted for this option
            var existingVote = await _voteRepository.GetByEventOptionAndVoterAsync(eventId, optionId, voterId);

            if (existingVote != null)
            {
                // Update existing vote
                existingVote.VoteValue = voteValue;
                existingVote.VoteComment = comment;
                existingVote.VotedAt = DateTimeOffset.Now;
                await _voteRepository.UpdateAsync(existingVote);
            }
            else
            {
                // Create new vote
                var vote = new EventVote
                {
                    EventId = eventId,
                    OptionId = optionId,
                    VoterId = voterId,
                    VoteValue = voteValue,
                    VoteComment = comment,
                    VotedAt = DateTimeOffset.Now
                };

                await _voteRepository.CreateAsync(vote);
            }

            return true;
        }

        public async Task<Dictionary<Guid, int>> GetVoteStatisticsAsync(Guid eventId)
        {
            return await _voteRepository.GetVoteStatisticsAsync(eventId);
        }

        public async Task<Guid> CalculateWinningVenueAsync(Guid eventId)
        {
            var voteStats = await GetVoteStatisticsAsync(eventId);

            if (!voteStats.Any())
            {
                // If no votes, return the highest AI scored option
                var options = await _optionRepository.GetByEventIdAsync(eventId);
                var topOption = options.OrderByDescending(epo => epo.AiScore).FirstOrDefault();

                return topOption?.PlaceId ?? Guid.Empty;
            }

            // Get the option with highest vote score
            var winningOptionId = voteStats
                .OrderByDescending(kvp => kvp.Value)
                .First()
                .Key;

            var winningOption = await _optionRepository.GetByIdAsync(winningOptionId);

            return winningOption?.PlaceId ?? Guid.Empty;
        }
    }
}

