import Link from "next/link";

export const metadata = { title: "Privacy Policy — SpendWise" };

const EFFECTIVE_DATE = "May 16, 2026";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            SpendWise
          </Link>
          <Link
            href="/login"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-6 py-10 text-[15px] leading-relaxed">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
          <p className="mt-2 text-sm text-muted-foreground">Effective {EFFECTIVE_DATE}</p>
        </div>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Who runs SpendWise</h2>
          <p>
            SpendWise is a personal-finance dashboard operated by Ryan Snyder as a non-commercial
            project for friends and family. There are no employees, contractors, or other staff with
            access to your data. No fees are charged to end users.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">What we collect</h2>
          <p>We only collect data that's directly required to give you a working spending dashboard:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Account information:</strong> the email address and password you provide when
              registering. Passwords are stored only as a bcrypt hash; we cannot read them.
            </li>
            <li>
              <strong>Profile:</strong> an optional avatar image if you upload one.
            </li>
            <li>
              <strong>CSV files you upload:</strong> the original file plus the transactions parsed
              from it.
            </li>
            <li>
              <strong>Bank-connected transactions:</strong> if you choose to connect a bank account
              through Plaid, we receive your transaction history, account names, masks, and the
              institution name. We do <strong>not</strong> receive your bank login credentials —
              those are handled entirely by Plaid (see below).
            </li>
            <li>
              <strong>Two-factor-authentication data:</strong> if you enable MFA, your
              authenticator-app secret and one-time backup-code hashes.
            </li>
            <li>
              <strong>Preferences:</strong> minor UI state like your last-used dashboard period.
            </li>
            <li>
              <strong>Standard server logs:</strong> request errors and basic operational data, kept
              to help us debug problems. We do not log passwords, MFA secrets, full transaction
              descriptions, or full CSV contents.
            </li>
          </ul>
          <p>
            We do <strong>not</strong> collect: bank login credentials, Social Security numbers,
            full account numbers, payment-card data, advertising identifiers, location data, or any
            data that would enable us to move money on your behalf.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">How we use your data</h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>To show you your own transactions, categories, and spending insights.</li>
            <li>To parse the CSV files you upload.</li>
            <li>To fetch new transactions from your bank through Plaid when you request a sync.</li>
            <li>To authenticate you when you sign in.</li>
            <li>To respond to your support requests.</li>
          </ul>
          <p>
            We do not use your data for advertising, profiling, training machine-learning models, or
            any purpose unrelated to running this app.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Who we share data with</h2>
          <p>
            We share your data with the minimum number of service providers needed to run the
            application. These are:
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Plaid</strong> — when you choose to connect a bank account, Plaid handles the
              authentication with your financial institution and returns transaction data to us.
              Plaid&apos;s handling of your data is governed by Plaid&apos;s own privacy policy,
              which is shown to you when you start a Plaid Link flow.{" "}
              <a
                href="https://plaid.com/legal/#end-user-privacy-policy"
                className="text-foreground underline-offset-4 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                Read Plaid&apos;s end-user privacy policy
              </a>
              .
            </li>
            <li>
              <strong>Hosting provider (Vercel)</strong> — runs the application and stores its
              database. Your data is encrypted at rest on Vercel&apos;s infrastructure.
            </li>
          </ul>
          <p>
            We do <strong>not</strong> sell your data, share it with advertisers, or share it with
            anyone else. Your data is never shown to other users of the application.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">How we protect your data</h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>All traffic between your browser and our servers uses HTTPS (TLS 1.2 or higher).</li>
            <li>
              Your password is stored as a bcrypt hash. The original password cannot be recovered.
            </li>
            <li>
              Plaid access tokens and MFA secrets are encrypted with AES-256-GCM before being
              written to the database. Encryption keys are kept separately from the database.
            </li>
            <li>
              The database disk itself is encrypted at rest with AES-256 by our hosting provider.
            </li>
            <li>
              Every data query is scoped to your account ID. There is no admin role, no
              cross-user access path, and no impersonation feature.
            </li>
            <li>
              Two-factor authentication is available and recommended for every account.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Your choices and rights</h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Disconnect a bank</strong> at any time from the Files page. Disconnecting
              invalidates the access token with Plaid. Transactions already imported remain in your
              account unless you also delete them.
            </li>
            <li>
              <strong>Delete an uploaded file</strong> at any time. Deleting removes the file from
              disk and all transactions parsed from it.
            </li>
            <li>
              <strong>Freeze an uploaded file</strong> to exclude its transactions from your
              dashboard without deleting them.
            </li>
            <li>
              <strong>Delete your account</strong> by contacting us. Deletion cascades to remove all
              of your files, transactions, Plaid connections, MFA data, and preferences.
            </li>
            <li>
              <strong>Export your data</strong> by contacting us; we&apos;ll provide a copy in a
              standard format on request.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Data retention</h2>
          <p>
            We retain your data for as long as your account exists. If you delete your account, your
            data is removed from the active database immediately. Routine database backups, retained
            for short-term operational recovery, may include a copy for up to 30 days before being
            overwritten.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Children&apos;s privacy</h2>
          <p>
            SpendWise is not intended for use by children under 13, and we do not knowingly collect
            information from anyone under 13. If you believe a child has provided us with personal
            information, please contact us and we will delete it.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Changes to this policy</h2>
          <p>
            If we make material changes to this policy, we will notify you by email at the address
            associated with your account at least 14 days before the changes take effect. Continued
            use of the application after that date constitutes acceptance of the updated policy.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Contact</h2>
          <p>
            Questions about this policy or your data? Contact Ryan Snyder at{" "}
            <a
              href="mailto:1rksnyder@gmail.com"
              className="text-foreground underline-offset-4 hover:underline"
            >
              1rksnyder@gmail.com
            </a>
            .
          </p>
        </section>

        <footer className="border-t border-border pt-6 text-sm text-muted-foreground">
          <Link href="/login" className="underline-offset-4 hover:text-foreground hover:underline">
            Back to sign in
          </Link>
        </footer>
      </main>
    </div>
  );
}
