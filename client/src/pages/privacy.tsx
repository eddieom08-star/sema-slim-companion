export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-muted-foreground mb-8">Last updated: March 20, 2026</p>

      <div className="space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold mb-2">1. Information We Collect</h2>
          <p>
            SemaSlim collects information you provide directly when creating an account (email address, name) and health-related data you enter voluntarily (weight, food logs, medication schedules, fitness goals). We also collect device identifiers and usage analytics to improve the app experience.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">2. How We Use Your Information</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Provide and personalize the SemaSlim experience, including AI-powered meal plans and recipe suggestions</li>
            <li>Track your progress toward health and weight management goals</li>
            <li>Process in-app purchases and manage your subscription</li>
            <li>Send transactional notifications (e.g., streak reminders, medication alerts)</li>
            <li>Improve app performance, fix bugs, and develop new features</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">3. Data Storage & Security</h2>
          <p>
            Your data is stored securely on servers hosted by Vercel and Neon (PostgreSQL). Authentication is handled by Clerk. All data is transmitted over HTTPS/TLS encryption. We do not sell, rent, or share your personal health data with third parties for marketing purposes.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">4. Third-Party Services</h2>
          <p>We use the following third-party services that may process your data:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Clerk</strong> — Authentication and user management</li>
            <li><strong>Stripe</strong> — Payment processing (web)</li>
            <li><strong>RevenueCat / Apple</strong> — In-app purchase management (iOS)</li>
            <li><strong>OpenAI</strong> — AI-powered meal planning and recipe suggestions (anonymized prompts only, no personal identifiers sent)</li>
            <li><strong>Open Food Facts</strong> — Barcode and nutrition database lookups</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">5. Health Data</h2>
          <p>
            SemaSlim processes health-related information (weight, food intake, medication schedules) that you voluntarily provide. This data is used solely to deliver the app's core functionality. We do not share health data with advertisers or data brokers. You can delete all your health data at any time from your profile settings.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">6. Your Rights</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Access:</strong> Request a copy of your personal data</li>
            <li><strong>Correction:</strong> Update inaccurate information</li>
            <li><strong>Deletion:</strong> Request deletion of your account and all associated data</li>
            <li><strong>Portability:</strong> Export your data in a standard format</li>
          </ul>
          <p className="mt-2">To exercise these rights, contact us at the email below.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">7. Data Retention</h2>
          <p>
            We retain your data for as long as your account is active. Free tier users' historical data is retained for 14 days. Pro subscribers have unlimited history retention. Upon account deletion, all personal data is permanently removed within 30 days.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">8. Children's Privacy</h2>
          <p>
            SemaSlim is not intended for use by children under 13. We do not knowingly collect personal information from children under 13. If we become aware that a child under 13 has provided us with personal information, we will delete it promptly.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">9. Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">10. Contact Us</h2>
          <p>
            If you have questions about this privacy policy or your data, contact us at:
          </p>
          <p className="mt-2 font-medium">support@semaslim.com</p>
        </section>
      </div>
    </div>
  );
}
