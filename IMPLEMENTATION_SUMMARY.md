# Brukernavn og Fødselsdato Implementering

## ✅ Fullført

### Database
- ✅ Lagt til `username`, `usernameChangesThisYear`, `lastUsernameChangeYear` i User schema
- ✅ Kjørt migrasjon (20251026121255_add_username_and_tracking)
- ✅ `dateOfBirth` feltet eksisterer allerede

### Backend Utils
- ✅ Opprettet `/backend/src/utils/username.ts` med:
  - `generateUsername()` - Genererer unikt brukernavn fra e-post
  - `calculateAge()` - Beregner alder fra fødselsdato
  - `canChangeUsername()` - Validerer maks 3 endringer/år

### Auth Controller
- ✅ Oppdatert `auth.controller.ts`:
  - Importerer `generateUsername`
  - Genererer brukernavn automatisk ved registrering

## 🔨 Manuelle endringer som kreves

### 1. User Controller - Legg til brukernavn-endring

Åpne `/backend/src/controllers/user.controller.ts` og legg til denne importen på toppen:

```typescript
import { canChangeUsername } from '../utils/username';
```

Finn `updateUser` metoden og erstatt den med:

```typescript
// Update user
async updateUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const userId = req.userId!;
    const { firstName, lastName, phone, dateOfBirth, avatar, username } = req.body;

    // Check if user is updating their own profile or is admin
    if (userId !== id && !['ADMIN', 'SUPER_ADMIN'].includes(req.role!)) {
      throw new AppError('Ingen tilgang til å oppdatere denne brukeren', 403);
    }

    // Get current user data
    const currentUser = await prisma.user.findFirst({
      where: { id, tenantId }
    });

    if (!currentUser) {
      throw new AppError('Bruker ikke funnet', 404);
    }

    const updateData: any = {
      firstName,
      lastName,
      phone,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      avatar
    };

    // Handle username change
    if (username && username !== currentUser.username) {
      // Check if username is already taken
      const existingUser = await prisma.user.findFirst({
        where: {
          tenantId,
          username,
          id: { not: id }
        }
      });

      if (existingUser) {
        throw new AppError('Brukernavnet er allerede tatt', 400);
      }

      // Check if user can change username
      const canChange = canChangeUsername(
        currentUser.usernameChangesThisYear,
        currentUser.lastUsernameChangeYear
      );

      if (!canChange.allowed) {
        throw new AppError(canChange.message!, 400);
      }

      const currentYear = new Date().getFullYear();

      updateData.username = username;
      updateData.usernameChangesThisYear = currentUser.lastUsernameChangeYear === currentYear
        ? currentUser.usernameChangesThisYear + 1
        : 1;
      updateData.lastUsernameChangeYear = currentYear;
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        dateOfBirth: true,
        username: true,
        usernameChangesThisYear: true,
        lastUsernameChangeYear: true,
        avatar: true,
        role: true,
        active: true
      }
    });

    res.json({ success: true, data: user });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      console.error('Update user error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke oppdatere bruker' });
    }
  }
}
```

Finn også `getUserById` metoden og oppdater select-feltet for å inkludere username:

```typescript
select: {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  dateOfBirth: true,
  username: true,
  usernameChangesThisYear: true,
  lastUsernameChangeYear: true,
  avatar: true,
  role: true,
  active: true,
  createdAt: true,
  _count: {
    select: {
      bookings: true,
      ptSessions: true,
      trainingPrograms: true
    }
  }
}
```

### 2. Frontend Types

Åpne `/frontend/src/types/index.ts` (eller hvor User-typen er definert) og oppdater:

```typescript
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
  username?: string;
  usernameChangesThisYear?: number;
  lastUsernameChangeYear?: number;
  avatar?: string;
  role: 'CUSTOMER' | 'TRAINER' | 'ADMIN' | 'SUPER_ADMIN';
  active: boolean;
  tenantId: string;
}
```

### 3. Frontend API

Åpne `/frontend/src/services/api.ts` og oppdater:

```typescript
// Legg til i updateUser metoden
async updateUser(userId: string, data: {
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
  username?: string;
  avatar?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  const response = await this.api.patch(`/users/${userId}`, data);
  return response.data;
}
```

### 4. RegisterPage - Legg til fødselsdato

Åpne `/frontend/src/pages/RegisterPage.tsx` og legg til:

```typescript
const [dateOfBirth, setDateOfBirth] = useState('');

// I form, legg til etter phone-feltet:
<div>
  <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700">
    Fødselsdato
  </label>
  <input
    id="dateOfBirth"
    name="dateOfBirth"
    type="date"
    value={dateOfBirth}
    onChange={(e) => setDateOfBirth(e.target.value)}
    className="input mt-1"
    max={new Date().toISOString().split('T')[0]}
  />
</div>

// I handleSubmit, legg til dateOfBirth i register-kallet:
await register({
  firstName,
  lastName,
  email,
  password,
  phone,
  dateOfBirth  // Legg til denne
});
```

### 5. ProfilePage - Vis og rediger brukernavn, fødselsdato, alder

Åpne `/frontend/src/pages/ProfilePage.tsx` og erstatt innholdet med den vedheftede filen.

## Testing

1. **Test registrering**:
   - Registrer ny bruker med fødselsdato
   - Sjekk at brukernavn genereres automatisk

2. **Test profil-oppdatering**:
   - Endre brukernavn (maks 3 ganger/år)
   - Endre fødselsdato
   - Verifiser at alder beregnes riktig

3. **Test validering**:
   - Prøv å endre brukernavn mer enn 3 ganger på ett år
   - Prøv å bruke et brukernavn som allerede eksisterer
