using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class MessageReadReceipt
    {
        public Guid ReceiptId { get; set; }
        public Guid MessageId { get; set; }
        public Guid UserId { get; set; }
        public DateTimeOffset ReadAt { get; set; }

        // Navigation properties
        public Message Message { get; set; }
        public User User { get; set; }

        public MessageReadReceipt()
        {
            ReceiptId = Guid.NewGuid();
            ReadAt = DateTimeOffset.UtcNow;
        }
    }
}
