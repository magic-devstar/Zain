const origin = import.meta.env.VITE_BACKEND_URL;

const Avatar = ({ user, color = "bg-purple-500", size = "md" }) => {
    const isMediaImage = user.profile_image && user.profile_image.startsWith("/media");

    // Size classes for different avatar sizes
    const sizeClasses = {
        xs: "w-6 h-6 min-w-6 min-h-6",
        sm: "w-8 h-8 min-w-8 min-h-8", 
        md: "w-10 h-10 min-w-10 min-h-10",
        lg: "w-12 h-12 min-w-12 min-h-12",
        xl: "w-16 h-16 min-w-16 min-h-16"
    };

    const avatarSize = sizeClasses[size] || sizeClasses.md;

    return (
        <div className="flex items-center justify-center flex-shrink-0" data-btnbelowtooltip={user?.username}>
            {isMediaImage ? (
                <img
                    src={`${origin}${user.profile_image}`}
                    alt={user.username}
                    className={`${avatarSize} rounded-full ${color} object-cover flex-shrink-0`}
                />
            ) : (
                // Otherwise, display the initials
                <img
                    src={user.profile_image || "https://ui-avatars.com/api/?name=" + user.username}
                    alt={user.username}
                    className={`${avatarSize} rounded-full object-cover flex-shrink-0`}
                />
            )}
        </div>
    );
};

export default Avatar;