using Microsoft.AspNetCore.Identity.UI.Services;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;

namespace DoXM_Server.Services
{
    public class EmailSender : IEmailSender
    {
        public EmailSender(ApplicationConfig appConfig)
        {
            AppConfig = appConfig;
        }

        private ApplicationConfig AppConfig { get; }

        public Task SendEmailAsync(string email, string replyTo, string subject, string htmlMessage)
        {
            var mailClient = new SmtpClient();
            mailClient.Host = AppConfig.SmtpHost;
            mailClient.Port = AppConfig.SmtpPort;
            mailClient.EnableSsl = true;
            mailClient.Credentials = new NetworkCredential(AppConfig.SmtpUserName, AppConfig.SmtpPassword);
            mailClient.DeliveryMethod = SmtpDeliveryMethod.Network;

            var from = new MailAddress(AppConfig.SmtpEmail, AppConfig.SmtpDisplayName, System.Text.Encoding.UTF8);
            var to = new MailAddress(email);

            var mailMessage = new MailMessage(from, to);
            mailMessage.IsBodyHtml = true;
            mailMessage.Subject = subject;
            mailMessage.Body = htmlMessage;
            mailMessage.ReplyToList.Add(new MailAddress(replyTo));

            try
            {
                mailClient.Send(mailMessage);
            }
            catch { }
            return Task.CompletedTask;
        }

        public Task SendEmailAsync(string email, string subject, string htmlMessage)
        {
            return SendEmailAsync(email, AppConfig.SmtpEmail, subject, htmlMessage);
        }
    }
}
