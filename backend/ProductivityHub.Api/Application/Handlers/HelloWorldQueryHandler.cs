using MediatR;
using ProductivityHub.Api.Application.Queries;

namespace ProductivityHub.Api.Application.Handlers;

public class HelloWorldQueryHandler : IRequestHandler<HelloWorldQuery, string>
{
    public Task<string> Handle(HelloWorldQuery request, CancellationToken cancellationToken)
    {
        var message = string.IsNullOrEmpty(request.Name) 
            ? "Hello, World from ProductivityHub API!" 
            : $"Hello, {request.Name} from ProductivityHub API!";
            
        return Task.FromResult(message);
    }
}