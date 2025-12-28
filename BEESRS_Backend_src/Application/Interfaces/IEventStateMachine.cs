using System;
using System.Threading.Tasks;
using Domain.Entities;

namespace Application.Interfaces
{
    public interface IEventStateMachine
    {
        Task<bool> CanTransitionAsync(Event eventEntity, string newStatus);
        Task TransitionToAsync(Event eventEntity, string newStatus, string reason = null);
        Task<bool> ValidateTransitionAsync(Event eventEntity, string newStatus);
    }
}



















































































