# ObliKey - Booking & Feedback Forbedringer

## ✅ IMPLEMENTERT

### 1. Booking-regler (Anti-Dobbelboking)
**Lokasjon:** `booking.controller.ts:48-89`

```typescript
// Sjekker for overlappende bookinger
const overlappingBookings = await prisma.booking.findMany({
  where: {
    userId,
    status: { in: ['PENDING', 'CONFIRMED'] },
    class: {
      OR: [/* overlapping time logic */]
    }
  }
});
```

**Hva det gjør:**
- ✅ Sjekker om bruker allerede har booket samme klasse
- ✅ Sjekker om bruker har overlappende booking på samme tidspunkt
- ✅ Gir tydelig feilmelding med konfliktklasse og tidspunkt

**Feilmeldinger:**
- "Du har allerede booket denne klassen"
- "Du har allerede en booking på dette tidspunktet: Yoga kl 18:00"

### 2. Feedback/Vurdering-System
**Database:** `schema-feedback.prisma`
**Controller:** `feedback.controller.ts`
**Routes:** `feedback.routes.ts`

**Typer av Feedback:**
- `CLASS_REVIEW` - Vurdering av klasse (1-5 stjerner)
- `TRAINER_REVIEW` - Vurdering av trener
- `APP_FEEDBACK` - Generell tilbakemelding
- `SUGGESTION` - Forbedringsforslag
- `BUG_REPORT` - Feilrapport

**API Endpoints:**
```
POST   /api/feedback                    # Send tilbakemelding
GET    /api/feedback/my-feedback        # Mine tilbakemeldinger
GET    /api/feedback                    # Alle (ADMIN)
PATCH  /api/feedback/:id/respond        # Svar på tilbakemelding (ADMIN)
GET    /api/feedback/class/:id/reviews  # Vurderinger for klasse (public)
GET    /api/feedback/trainer/:id/reviews # Vurderinger for trener (public)
```

**Funksjonalitet:**
- Rating 1-5 stjerner
- Anonym tilbakemelding (valgfritt)
- Public reviews (kan vises offentlig)
- Admin kan svare på tilbakemeldinger
- Automatisk gjennomsnitts-rating

### 3. Notification Schema (Påbegynt)
**Database:** `schema-feedback.prisma`

**Notification Typer:**
- `BOOKING_CONFIRMATION` - Booking bekreftet
- `BOOKING_REMINDER` - Påminnelse X timer før
- `BOOKING_CANCELLED` - Booking kansellert
- `CLASS_CANCELLED` - Klasse kansellert av admin
- `CLASS_UPDATED` - Klasse endret
- `MESSAGE_RECEIVED` - Ny melding
- `ANNOUNCEMENT` - Generell kunngjøring

**Kanaler:**
- `IN_APP` - I appen
- `EMAIL` - E-post
- `SMS` - SMS
- `PUSH` - Push-varsel

**Bruker-innstillinger:**
- Velg hvilke varsler du vil ha
- Velg når du vil få påminnelse (X timer før)
- Skru av/på for hver kanal

## 📋 GJENSTÅENDE OPPGAVER

### 1. Database Migration
**Hva:** Kjør Prisma migration for å legge til Feedback og Notification tabeller

**Hvordan:**
```bash
cd backend

# Kopier relevante modeller fra schema-feedback.prisma til schema.prisma
# Deretter:
npx prisma migrate dev --name add_feedback_and_notifications
npx prisma generate
```

**Viktig:** Dette vil legge til:
- `Feedback` tabell
- `Notification` tabell
- `NotificationSettings` tabell
- Relasjoner til User, Tenant, Class

### 2. Frontend - API Service
**Fil:** `frontend/src/services/api.ts`

Legg til:
```typescript
// Feedback
async createFeedback(data: any) {
  return await this.api.post('/feedback', data);
}

async getMyFeedback() {
  return await this.api.get('/feedback/my-feedback');
}

async getClassReviews(classId: string) {
  return await this.api.get(`/feedback/class/${classId}/reviews`);
}

// Notifications
async getMyNotifications() {
  return await this.api.get('/notifications');
}

async markNotificationAsRead(id: string) {
  return await this.api.patch(`/notifications/${id}/read`);
}
```

### 3. Frontend - Forbedret BookingsPage
**Fil:** `frontend/src/pages/BookingsPage.tsx`

**Nye Features:**
- ⭐ Rating-knapp etter gjennomført time
- 📝 "Gi feedback"-knapp
- 🔔 Varslinger-ikon med antall uleste
- 📊 Bedre oversikt over kommende/tidligere bookinger
- ⏰ Tidteller til neste time

### 4. Frontend - Feedback Modal
**Komponent:** `frontend/src/components/FeedbackModal.tsx`

**Innhold:**
- Rating (1-5 stjerner)
- Tittel (valgfritt)
- Melding
- Type (klasse/trener/app)
- Anonym (checkbox)

### 5. Notification Service (Backend)
**Fil:** `backend/src/services/notification.service.ts`

**Funksjonalitet:**
- Scheduled notifications (cron job)
- Send e-post påminnelse X timer før klasse
- Send SMS påminnelse (Twilio integration)
- Push notifications (Firebase/OneSignal)

**Cron Job:**
```typescript
// Sjekk hver 15. minutt for kommende klasser
cron.schedule('*/15 * * * *', async () => {
  // Finn alle bookinger som starter om X timer
  // Sjekk om bruker vil ha påminnelse
  // Send varsel
});
```

### 6. Frontend - Notification System
**Komponent:** `frontend/src/components/NotificationBell.tsx`

**Innhold:**
- Bell-ikon med antall uleste (badge)
- Dropdown med siste varsler
- "Merk alle som lest"-knapp
- Link til full notification-side

### 7. Admin - Feedback Dashboard
**Side:** `frontend/src/pages/admin/FeedbackPage.tsx`

**Innhold:**
- Liste over all feedback
- Filter på type/status
- Svar på feedback
- Statistikk (gjennomsnittlig rating)
- Eksporter feedback til CSV

## 🚀 NESTE STEG - Implementeringsrekkefølge

### Fase 1: Database (5 min)
1. Kopier feedback/notification modeller til schema.prisma
2. Kjør migration
3. Test i Prisma Studio

### Fase 2: Backend Notifications (30 min)
1. Lag notification.controller.ts
2. Lag notification.routes.ts
3. Lag notification.service.ts (cron job)
4. Integrer med e-post service

### Fase 3: Frontend Feedback (45 min)
1. Oppdater api.ts
2. Lag FeedbackModal komponent
3. Oppdater BookingsPage med feedback-knapp
4. Test ende-til-ende

### Fase 4: Frontend Notifications (30 min)
1. Lag NotificationBell komponent
2. Lag NotificationsPage
3. Oppdater Layout med bell-ikon
4. Test notifications

### Fase 5: Admin Dashboard (30 min)
1. Lag admin/FeedbackPage
2. Vis statistikk
3. Svar på feedback
4. Test admin-funksjoner

## 📊 Feature Flags

Legg til i `TenantFeatures`:
```prisma
publicReviews         Boolean @default(false)  // Vis vurderinger offentlig
smsReminders          Boolean @default(false)  // SMS-påminnelser
pushNotifications     Boolean @default(false)  // Push-varsler
```

**Plan Mapping:**
- **STARTER**: publicReviews ❌, smsReminders ❌, pushNotifications ❌
- **BASIC**: publicReviews ✅, smsReminders ❌, pushNotifications ❌
- **PRO**: publicReviews ✅, smsReminders ✅, pushNotifications ✅
- **ENTERPRISE**: Alle ✅

## 🎯 Brukerflyt - Booking med Feedback

### 1. Booking
```
Bruker -> Velger klasse
       -> Prøver å booke
       -> System sjekker:
          ✅ Klasse ikke full
          ✅ Ikke allerede booket
          ✅ Ikke overlapp med andre bookinger
       -> Booking bekreftes
       -> E-post sendes
       -> Varsel scheduleres (2 timer før)
```

### 2. Påminnelse
```
2 timer før klasse:
  -> System sender e-post/SMS
  -> In-app notification
  -> Push notification (hvis aktivert)
```

### 3. Etter Klasse
```
24 timer etter klasse:
  -> System sender forespørsel om vurdering
  -> Bruker ser "Gi feedback"-knapp på booking
  -> Bruker gir rating og kommentar
  -> Admin kan se feedback
  -> Public reviews vises på klasseside (hvis aktivert)
```

## 🔐 Sikkerhet

### Validering
- ✅ Rating må være 1-5
- ✅ Melding max 1000 tegn
- ✅ Kun egen bookinger
- ✅ Kan ikke gi feedback til fremtidige klasser
- ✅ Kan kun gi én feedback per booking

### Permissions
- CUSTOMER: Send feedback, se egne feedbacks
- ADMIN: Se all feedback, svare på feedback
- TRAINER: Se feedback på egne klasser

## 💡 Tips

### Testing Dobbelboking
1. Book en klasse kl 18:00-19:00
2. Prøv å booke en annen klasse kl 18:30-19:30
3. Skal få feilmelding om overlapp

### Testing Feedback
1. Book og gjennomfør en klasse
2. Se "Gi feedback"-knapp
3. Send rating og kommentar
4. Sjekk at den vises i admin panel

### Testing Varsler
1. Sett reminderHoursBefore til 0.25 (15 min)
2. Book en klasse om 20 min
3. Vent 5 min
4. Sjekk at du får varsel

## 📚 Nyttige Lenker

- Feedback API: http://localhost:3000/api/feedback
- Notifications API: http://localhost:3000/api/notifications (kommer)
- Admin Feedback: http://localhost:5173/admin/feedback (kommer)
- Booking Oversikt: http://localhost:5173/bookings

## 🎨 UI/UX Forbedringer

### Booking Card (Forbedret)
```tsx
<BookingCard>
  <ClassInfo>
    <ClassImage />
    <ClassDetails>
      <ClassName />
      <TrainerName />
      <DateTime />
      <Location />
    </ClassDetails>
  </ClassInfo>

  {isPastClass && !hasFeedback && (
    <FeedbackButton onClick={openFeedbackModal} />
  )}

  {isPastClass && hasFeedback && (
    <ViewFeedbackButton />
  )}

  {isFutureClass && (
    <>
      <CancelButton />
      <CountdownTimer />
    </>
  )}
</BookingCard>
```

### Notification Bell
```tsx
<NotificationBell>
  <BellIcon />
  {unreadCount > 0 && <Badge>{unreadCount}</Badge>}

  <Dropdown>
    {notifications.map(n => (
      <NotificationItem
        type={n.type}
        message={n.message}
        time={n.createdAt}
        isRead={n.isRead}
        onClick={() => markAsRead(n.id)}
      />
    ))}
    <ViewAllLink />
  </Dropdown>
</NotificationBell>
```

## ✅ Oppsummering

**Implementert:**
- ✅ Anti-dobbelboking
- ✅ Feedback/vurdering backend API
- ✅ Feedback database schema
- ✅ Notification schema

**Gjenstår:**
- ⏳ Database migration
- ⏳ Frontend feedback modal
- ⏳ Forbedret bookings-oversikt
- ⏳ Notification service (cron job)
- ⏳ Frontend notification bell
- ⏳ Admin feedback dashboard

**Estimert tid for å fullføre:** 2-3 timer

Vil du at jeg skal fortsette med neste steg, eller vil du fokusere på Shop/CMS-modulen først?
