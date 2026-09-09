import { useState } from "react";
import { Camera, Check, LockKeyhole, UserRound, X } from "lucide-react";
import { Dashboard } from "../Dashboard";
import { ModuleViewHeader } from "../../Common/ModuleViewHeader";
import { UserAvatar } from "../../Common/UserAvatar";
import { useAuth } from "../../../store/useAuth";

function getFormValues(user) {
  return {
    name: user.name,
    email: user.email,
    phone: user.phone ?? "",
    organisation: user.organisation ?? "",
    designation: user.designation ?? user.role ?? "",
    photoUrl: user.photoUrl ?? "",
    password: "",
  };
}

export function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => getFormValues(user));
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function openEditor() {
    setForm(getFormValues(user));
    setError("");
    setSuccess("");
    setEditing(true);
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
      setError("Choose an image smaller than 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateField("photoUrl", reader.result);
    reader.readAsDataURL(file);
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (
      !form.name.trim() ||
      !form.email.trim() ||
      !form.organisation.trim() ||
      !form.designation.trim()
    ) {
      setError("Name, email, organisation, and designation are required.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (form.password && form.password.length < 8) {
      setError("A new password must be at least 8 characters.");
      return;
    }
    updateProfile(form);
    setForm((current) => ({ ...current, password: "" }));
    setError("");
    setSuccess("Profile updated successfully.");
    setEditing(false);
  }

  return (
    <Dashboard>
      <ModuleViewHeader
        eyebrow="ACCOUNT / PROFILE"
        title="Commander profile"
        text="Manage your identity, role and account security."
        action={
          <button className="module-action" onClick={openEditor}>
            <UserRound size={16} /> Edit profile
          </button>
        }
      />
      <div className="profile-layout">
        <div className="profile-card">
          <UserAvatar user={user} size="large" />
          <h2>{user.name}</h2>
          <p>{user.role}</p>
          <small>{user.organisation}</small>
          <strong className="profile-email">{user.email}</strong>
          <button className="module-action" onClick={openEditor}>
            Edit profile
          </button>
          {success && (
            <span className="profile-success">
              <Check size={14} /> {success}
            </span>
          )}
        </div>
        <div className="activity-panel">
          <h2>Account details</h2>
          {[
            ["Email", user.email],
            ["Phone", user.phone || "Not added"],
            ["Organisation", user.organisation],
            ["Designation", user.designation],
          ].map(([label, value]) => (
            <div className="profile-detail" key={label}>
              <span>{label}</span>
              <b>{value}</b>
            </div>
          ))}
          <h2 className="activity-title">Recent account activity</h2>
          {[
            "Signed in from a trusted device",
            "Exported OSI-2418 incident brief",
            "Updated notification preferences",
          ].map((item, index) => (
            <div key={item}>
              <i />
              <span>
                <b>{item}</b>
                <small>
                  {index + 1} hour{index ? "s" : ""} ago
                </small>
              </span>
            </div>
          ))}
        </div>
      </div>
      {editing && (
        <div
          className="profile-modal-backdrop"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setEditing(false)
          }
        >
          <section
            className="profile-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-modal-title"
          >
            <div className="profile-modal-heading">
              <div>
                <span className="module-eyebrow">ACCOUNT / PROFILE</span>
                <h2 id="profile-modal-title">Edit profile</h2>
                <p>Keep your operational identity and account details current.</p>
              </div>
              <button
                className="modal-close"
                onClick={() => setEditing(false)}
                aria-label="Close edit profile"
              >
                <X size={19} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="profile-form">
              <div className="profile-photo-editor">
                <UserAvatar user={{ ...user, ...form }} size="large" />
                <label className="photo-upload">
                  <Camera size={15} /> Change photo
                  <input type="file" accept="image/*" onChange={handlePhotoChange} />
                </label>
              </div>
              <div className="profile-form-grid">
                <label>
                  Name
                  <input
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                  />
                </label>
                <label>
                  Phone number
                  <input
                    value={form.phone}
                    onChange={(event) => updateField("phone", event.target.value)}
                  />
                </label>
                <label>
                  Organisation
                  <input
                    value={form.organisation}
                    onChange={(event) =>
                      updateField("organisation", event.target.value)
                    }
                  />
                </label>
                <label>
                  Designation
                  <input
                    value={form.designation}
                    onChange={(event) => updateField("designation", event.target.value)}
                  />
                </label>
                <label className="password-field">
                  <span>
                    Password <small>Leave blank to keep current password</small>
                  </span>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) => updateField("password", event.target.value)}
                    placeholder="New password"
                  />
                </label>
              </div>
              {error && <p className="form-error">{error}</p>}
              <div className="password-note">
                <LockKeyhole size={16} />
                <span>
                  Password changes are validated locally and never stored in the
                  browser.
                </span>
              </div>
              <div className="profile-modal-actions">
                <button
                  type="button"
                  className="modal-secondary"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="module-action">
                  Save changes
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </Dashboard>
  );
}
