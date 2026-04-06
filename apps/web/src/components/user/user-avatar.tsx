"use client"

interface UserAvatarProps {
  name?: string | null
  avatarUrl?: string | null
  size?: number
  className?: string
}

export function UserAvatar({ name, avatarUrl, size = 32, className = "" }: UserAvatarProps) {
  const letter = (name || "U").charAt(0).toUpperCase()

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || "用户头像"}
        width={size}
        height={size}
        className={`rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-blue-500 text-white font-medium select-none ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {letter}
    </div>
  )
}
