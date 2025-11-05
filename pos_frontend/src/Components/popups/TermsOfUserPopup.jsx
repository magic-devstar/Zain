import React from 'react';

function TermsOfUserPopup() {

    return (
        <div className="space-y-6 text-gray-800">
            <h1 className="text-3xl font-bold text-center">Terms and Conditions</h1>

            <div>
                <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
                <p>
                    By registering for or using the System, you agree to comply with and
                    be legally bound by these Terms. If you do not agree to these Terms,
                    you may not use the System.
                </p>
            </div>
            <hr />

            <div>
                <h2 className="text-xl font-semibold">2. System Access and Usage</h2>
                <ul className="list-disc pl-5 space-y-1">
                    <li>You must be authorized by an Admin or Manager to access the System.</li>
                    <li>Each user is responsible for maintaining the confidentiality of their login credentials.</li>
                    <li>Unauthorized access or misuse of another user’s account is strictly prohibited.</li>
                </ul>
            </div>
            <hr />

            <div>
                <h2 className="text-xl font-semibold">3. Data and Content</h2>
                <ul className="list-disc pl-5 space-y-1">
                    <li>
                        Users may upload images, QR scans, signatures, ticket details, and
                        financial records. You are responsible for ensuring your uploads do
                        not contain harmful or unauthorized content.
                    </li>
                    <li>Uploaded images and ticket attachments are stored for up to 6 months, after which they are permanently deleted.</li>
                    <li>We may collect and log user activity, IP addresses, and timestamps for system security and auditing.</li>
                </ul>
            </div>
            <hr />

            <div>
                <h2 className="text-xl font-semibold">4. Data Privacy</h2>
                <ul className="list-disc pl-5 space-y-1">
                    <li>We do not sell your data.</li>
                    <li>Sensitive actions (e.g., deletions, overrides) are restricted to super users and logged for transparency.</li>
                    <li>All personal and financial data is encrypted and handled in accordance with applicable data protection regulations.</li>
                </ul>
            </div>
            <hr />

            <div>
                <h2 className="text-xl font-semibold">5. Availability and Maintenance</h2>
                <ul className="list-disc pl-5 space-y-1">
                    <li>The System is available 99.9% of the time, excluding scheduled maintenance.</li>
                    <li>We are not liable for temporary interruptions or data loss caused by internet failure, third-party APIs, or technical errors.</li>
                </ul>
            </div>
            <hr />

            <div>
                <h2 className="text-xl font-semibold">6. Limitation of Liability</h2>
                <ul className="list-disc pl-5 space-y-1">
                    <li>The System is provided “as is” without warranty of any kind.</li>
                    <li>We are not responsible for indirect or consequential damages arising from use or inability to use the System.</li>
                </ul>
            </div>
            <hr />

            <div>
                <h2 className="text-xl font-semibold">7. Termination</h2>
                <ul className="list-disc pl-5 space-y-1">
                    <li>We reserve the right to suspend or terminate any user account at any time for violations of these Terms.</li>
                    <li>Customers and vendors may request account deactivation or data export at any time.</li>
                </ul>
            </div>
            <hr />

            <div>
                <h2 className="text-xl font-semibold">8. Changes to the Terms</h2>
                <p>
                    We may update these Terms from time to time. Continued use of the System after
                    changes constitutes acceptance of the new Terms.
                </p>
            </div>
        </div>
    );
}

export default TermsOfUserPopup;
