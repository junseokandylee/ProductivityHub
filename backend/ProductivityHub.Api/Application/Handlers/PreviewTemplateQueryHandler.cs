using MediatR;
using ProductivityHub.Api.Application.Queries;
using ProductivityHub.Api.DTOs;
using System.Text.RegularExpressions;

namespace ProductivityHub.Api.Application.Handlers;

public class PreviewTemplateQueryHandler : IRequestHandler<PreviewTemplateQuery, PreviewTemplateResponse>
{
    private static readonly Regex TokenRegex = new(@"\{([a-zA-Z0-9_]+)\}", RegexOptions.Compiled);

    public async Task<PreviewTemplateResponse> Handle(PreviewTemplateQuery request, CancellationToken cancellationToken)
    {
        var missingVariables = new List<string>();
        
        // Process message body
        var renderedBody = ProcessTemplate(request.MessageBody, request.Variables, missingVariables);
        
        // Process title if provided
        string? renderedTitle = null;
        if (!string.IsNullOrEmpty(request.Title))
        {
            renderedTitle = ProcessTemplate(request.Title, request.Variables, missingVariables);
        }

        return new PreviewTemplateResponse
        {
            RenderedBody = renderedBody,
            RenderedTitle = renderedTitle,
            MissingVariables = missingVariables.Distinct().ToList(),
            CharacterCount = renderedBody.Length
        };
    }

    private static string ProcessTemplate(string template, Dictionary<string, string> variables, List<string> missingVariables)
    {
        return TokenRegex.Replace(template, match =>
        {
            var variableName = match.Groups[1].Value.ToLower();
            
            if (variables.TryGetValue(variableName, out var value))
            {
                return value;
            }
            
            // Variable not found - add to missing list and return placeholder
            missingVariables.Add(variableName);
            return $"[{variableName}]";
        });
    }
}