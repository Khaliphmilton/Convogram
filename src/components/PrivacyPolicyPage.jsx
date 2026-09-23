import { Mail } from "lucide-react";

export function PrivacyPolicyPage() {
  return (
    <div className="legal-page">
      <div className="legal-inner">
        <a className="legal-brand" href="/">
          <span className="brand-mark">C</span>
          <span><b>Convogram</b><small>from Khaliph Industries</small></span>
        </a>

        <div className="legal-card">
          <p className="legal-kicker">KHALIPH INDUSTRIES</p>
          <h1>Privacy Policy</h1>
          <p className="legal-updated">Effective date: September 23, 2026</p>

          <p>
            Convogram ("Convogram", "we", "us", or "our") is a social and
            communication platform operated by Khaliph Industries. This Privacy
            Policy explains what information Convogram may collect, how we use it,
            how it may be shared, and the choices available to you.
          </p>

          <h2>1. Information you provide</h2>
          <p>When you create and use a Convogram account, you may provide:</p>
          <ul>
            <li>Your email address and account credentials.</li>
            <li>Your username, display name, biography, profile photo and website.</li>
            <li>Posts, captions, comments, Moments, Shorts and other content you choose to publish.</li>
            <li>Messages, reactions and other content you send through conversations.</li>
            <li>Community information and content you submit.</li>
            <li>Information you provide when requesting verification or contacting support.</li>
            <li>Reports and other information you submit about content or accounts.</li>
          </ul>

          <h2>2. Information created when you use Convogram</h2>
          <p>
            Convogram may store information associated with your activity on the
            service, such as likes, follows, comments, saved content, notifications,
            message read status, online or typing presence, Moment views, call
            participation information, community membership and account settings.
          </p>
          <p>
            For calls, Convogram's current backend records call-related information
            such as call type, status, participants and start/end information. This
            policy does not mean Convogram records the audio or video of a call unless
            a future feature specifically says so.
          </p>

          <h2>3. Photos, videos and other media</h2>
          <p>
            If you choose to upload a photo, video or other supported media, Convogram
            processes and stores that media so the feature you selected can work.
            Camera or microphone access may be requested by the Android application
            when a feature requires it. You can control these permissions through your
            device settings.
          </p>

          <h2>4. Notifications</h2>
          <p>
            If you enable notifications, Convogram may store a device notification
            identifier associated with your account so that push notifications can be
            delivered. You can disable notifications through your device or app
            settings where those controls are available.
          </p>

          <h2>5. How we use information</h2>
          <p>We may use information to:</p>
          <ul>
            <li>Create and authenticate accounts.</li>
            <li>Provide profiles, feeds, posts, Moments, Shorts, messaging, calls and communities.</li>
            <li>Deliver notifications and other requested communications.</li>
            <li>Maintain account security and protect users.</li>
            <li>Process reports, moderation and verification requests.</li>
            <li>Maintain, troubleshoot and improve Convogram.</li>
            <li>Respond to support and feedback requests.</li>
            <li>Comply with applicable legal obligations.</li>
          </ul>

          <h2>6. Public and private content</h2>
          <p>
            Convogram provides privacy controls such as private accounts and blocking.
            Content you choose to make public may be visible to other Convogram users
            and may be accessible through public areas of the service. Private-account
            controls limit access to content according to the feature's rules.
          </p>
          <p>
            Before publishing anything, consider whether you are comfortable sharing
            it with the audience selected in Convogram.
          </p>

          <h2>7. How information is shared</h2>
          <p>
            We do not sell your personal information as a product. Information may be
            shared as necessary to operate Convogram, including with service providers
            that help provide hosting, authentication, database, storage, notifications
            or other technical services.
          </p>
          <p>
            We may also disclose information when reasonably necessary to comply with
            law, respond to valid legal requests, protect the security of Convogram or
            its users, investigate abuse, or protect rights and property.
          </p>

          <h2>8. Supabase and service providers</h2>
          <p>
            Convogram currently uses Supabase for backend services including
            authentication and database functionality. Information submitted to
            Convogram may therefore be processed by infrastructure providers used to
            operate those services. Those providers may process information according
            to their own terms and privacy practices.
          </p>

          <h2>9. Security</h2>
          <p>
            Convogram uses account authentication and database access controls intended
            to restrict information to authorized users. No internet service can
            guarantee absolute security, so you should use a strong, unique password
            and protect access to your device and account.
          </p>

          <h2>10. Your choices</h2>
          <p>You may be able to:</p>
          <ul>
            <li>Update your profile information.</li>
            <li>Use privacy and blocking controls available in Convogram.</li>
            <li>Delete content you have permission to delete.</li>
            <li>Disable notifications through your device settings.</li>
            <li>Contact Convogram to ask questions about your information.</li>
          </ul>

          <h2>11. Account and content deletion</h2>
          <p>
            Convogram is designed so that account-related records are associated with
            your user account and user-owned content can be removed through supported
            features. If you need help with account or data deletion, contact us using
            the support address below. Some information may need to be retained when
            required by law, for security, dispute resolution, or legitimate operational
            purposes.
          </p>

          <h2>12. Children's privacy</h2>
          <p>
            Convogram is not intended for children who are not legally permitted to use
            the service in their jurisdiction. If you believe a child has provided
            personal information to Convogram in a way that violates applicable law,
            contact us so we can review the situation.
          </p>

          <h2>13. Changes to this policy</h2>
          <p>
            We may update this Privacy Policy as Convogram develops. When we make a
            material change, we may update the effective date and provide notice through
            Convogram or another appropriate channel.
          </p>

          <h2>14. Contact us</h2>
          <p>
            Questions, privacy requests and concerns can be sent to:
          </p>
          <a className="legal-contact" href="mailto:khaliphindustries@gmail.com">
            <Mail size={17} />
            khaliphindustries@gmail.com
          </a>

          <p className="legal-note">
            This Privacy Policy describes Convogram's current intended data practices
            based on the application's current features and backend. It is not a
            substitute for legal advice.
          </p>
        </div>
      </div>
    </div>
  );
}
