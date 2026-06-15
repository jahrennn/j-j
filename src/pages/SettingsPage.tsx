import { Button, Card, Input, Label } from "@/components/ui"
import { useAuth } from "@/lib/auth"

export function SettingsPage() {
  const { username } = useAuth()

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Settings
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your business profile and account.
        </p>
      </div>

      <Card className="p-6">
        <h3 className="font-semibold text-foreground">Business Profile</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          These details appear on printed sales reports.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="business">Business Name</Label>
            <Input id="business" defaultValue="Jahren and John LPG Trading" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="contact">Contact Number</Label>
            <Input id="contact" defaultValue="+63 900 000 0000" />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" defaultValue="123 Market St., Manila, PH" />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-foreground">Admin Account</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your administrator credentials.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" defaultValue={username ?? "admin"} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="newpass">New Password</Label>
            <Input id="newpass" type="password" placeholder="Leave blank to keep" />
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button>Save Changes</Button>
      </div>
    </div>
  )
}
