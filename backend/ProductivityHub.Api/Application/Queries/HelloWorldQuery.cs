using MediatR;

namespace ProductivityHub.Api.Application.Queries;

public class HelloWorldQuery : IRequest<string>
{
    public string? Name { get; set; }
}