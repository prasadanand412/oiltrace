function getInitials(name = "") {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "OT"
  );
}

export function UserAvatar({ user, size = "medium" }) {
  const initials = getInitials(user?.name);
  return (
    <span
      className={`user-avatar user-avatar-${size}`}
      aria-label={`${user?.name ?? "User"} avatar`}
    >
      {user?.photoUrl ? <img src={user.photoUrl} alt="" /> : initials}
    </span>
  );
}
