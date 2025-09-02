using MediatR;
using ProductivityHub.Api.DTOs;

namespace ProductivityHub.Api.Application.Queries;

public record PreviewTemplateQuery(
    string MessageBody,
    string? Title,
    Dictionary<string, string> Variables
) : IRequest<PreviewTemplateResponse>;