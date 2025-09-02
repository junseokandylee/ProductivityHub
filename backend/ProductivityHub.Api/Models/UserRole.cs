namespace ProductivityHub.Api.Models;

public enum UserRole
{
    Owner,
    Admin, 
    Staff
}

public static class UserRoleExtensions
{
    public static string ToRoleString(this UserRole role)
    {
        return role.ToString();
    }

    public static UserRole FromRoleString(string role)
    {
        return Enum.Parse<UserRole>(role, true);
    }
}