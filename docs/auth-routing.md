# Auth & Role-Based Routing System

## Overview

Sistem routing berbasis role yang telah diimplementasikan menggunakan Next.js middleware untuk memastikan pengguna diarahkan ke halaman yang sesuai berdasarkan role mereka.

## Architecture

### 1. Middleware (`middleware.ts`)
- **Location**: Root middleware yang berjalan sebelum setiap request
- **Function**: Memeriksa authentication status dan role user
- **Database Query**: Mengambil role dari tabel `profiles` bukan dari user metadata

### 2. Route Structure
```
/                    → Redirect berdasarkan role
/login               → Public (no auth required)
/register            → Public (no auth required)
/auth/unauthorized   → Public (unauthorized access page)
/catalog             → Public + Customer access
/dashboard           → Admin only
/pos                 → Cashier only
```

### 3. Role-Based Access Control

| Role | Allowed Routes | Default Redirect |
|------|----------------|------------------|
| **admin** | `/dashboard`, `/pos`, `/catalog`, `/` | `/dashboard` |
| **cashier** | `/pos`, `/` | `/pos` |
| **customer** | `/catalog`, `/` | `/catalog` |
| **unauthenticated** | `/login`, `/register`, `/catalog`, `/auth/unauthorized` | `/catalog` |

## Flow Logic

### 1. User Not Authenticated
- Jika mencoba akses protected route → Redirect ke `/login`
- Root path (`/`) → Redirect ke `/catalog`

### 2. User Authenticated
- Middleware query role dari `profiles` table
- Cek apakah user memiliki akses ke requested route
- **Jika tidak memiliki akses** → Redirect ke `/auth/unauthorized`
- **Root path** → Redirect ke dashboard sesuai role

### 3. Login Flow
1. User submit login form
2. Server action verifikasi credentials
3. Cookie session diset oleh server
4. Client redirect ke `/` (root)
5. Middleware otomatis redirect ke dashboard sesuai role

## Security Features

### 1. Three-Layer Security
- **Route Guard**: Middleware mencegah akses ke route yang tidak sesuai
- **Server Actions**: Semua DB mutations di server-side
- **Row Level Security**: Supabase RLS policies di database level

### 2. Session Management
- Menggunakan Supabase SSR client di middleware
- Cookie-based authentication
- Automatic session refresh

## Implementation Details

### Middleware Configuration
```typescript
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
}
```

### Role Checking
```typescript
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .single()

const userRole = profile?.role || 'customer'
```

### Access Control Logic
```typescript
let hasAccess = false

switch (userRole) {
  case 'admin':
    // Admin memiliki akses ke semua route
    hasAccess = [
      ...adminRoutes,
      ...cashierRoutes,
      ...customerRoutes
    ].some(route => path.startsWith(route)) || path === '/'
    break
  // ... other roles
}

if (!hasAccess && !publicRoutes.some(route => path.startsWith(route))) {
  return NextResponse.redirect(new URL('/auth/unauthorized', req.url))
}
```

## Testing Scenarios

### 1. Unauthenticated User
- Visit `/dashboard` → Redirect to `/login`
- Visit `/pos` → Redirect to `/login`
- Visit `/` → Redirect to `/catalog`

### 2. Admin User
- Visit `/dashboard` → ✅ Access granted
- Visit `/pos` → ✅ Access granted
- Visit `/catalog` → ✅ Access granted
- Visit `/` → Redirect to `/dashboard`

### 3. Cashier User
- Visit `/pos` → ✅ Access granted
- Visit `/dashboard` → Redirect to `/auth/unauthorized`
- Visit `/` → Redirect to `/pos`

### 4. Customer User
- Visit `/catalog` → ✅ Access granted
- Visit `/dashboard` → Redirect to `/auth/unauthorized`
- Visit `/pos` → Redirect to `/auth/unauthorized`
- Visit `/` → Redirect to `/catalog`

## Benefits

1. **Single Source of Truth**: Semua routing logic di middleware
2. **Server-Side Security**: Tidak bergantung pada client-side checks
3. **Automatic Redirects**: User otomatis diarahkan ke halaman yang tepat
4. **Clean Components**: Page components tidak perlu auth guards manual
5. **Scalable**: Mudah menambah role dan route baru

## Maintenance

### Adding New Role
1. Update role enum di database
2. Add route array di middleware
3. Update switch case untuk role baru
4. Add corresponding pages

### Adding New Route
1. Add route ke appropriate array (`adminRoutes`, `cashierRoutes`, etc.)
2. Create page component
3. Test access control

## Troubleshooting

### Common Issues
1. **Infinite Redirect**: Check route definitions and logic
2. **404 Errors**: Verify page components exist
3. **Access Denied**: Check role data in `profiles` table
4. **Session Issues**: Verify Supabase configuration

### Debug Steps
1. Check browser network tab for redirects
2. Verify `profiles` table data
3. Check middleware logs
4. Test with different user roles
