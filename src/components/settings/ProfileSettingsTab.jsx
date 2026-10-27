import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, KeyRound, LoaderCircle, Move, Save, Trash2, UserRound, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { apiFetch } from "../../api";
import { useAuth } from "../../context/AuthContext";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import { showToast } from "../../utils/toast";
import PasswordChangeModal from "../common/PasswordChangeModal";

const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_SOURCE_PHOTO_BYTES = 20 * 1024 * 1024;
const MAX_SOURCE_IMAGE_PIXELS = 40_000_000;
const CROP_VIEW_SIZE = 256;
const CROP_OUTPUT_SIZE = 512;
const PROFILE_INPUT_CLASS =
  "w-full rounded-input border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-slate-800 disabled:bg-gray-100";

function normalizeProfile(profile) {
  return {
    name: String(profile?.name ?? ""),
    username: String(profile?.username ?? ""),
    email: String(profile?.email ?? ""),
    phone: String(profile?.phone ?? ""),
    profile_photo_url: profile?.profile_photo_url || null,
  };
}

function cropLayout(source, zoom) {
  const scale =
    Math.max(CROP_VIEW_SIZE / source.width, CROP_VIEW_SIZE / source.height) * zoom;
  return {
    scale,
    width: source.width * scale,
    height: source.height * scale,
  };
}

function constrainCropOffset(offset, width, height) {
  const maxX = Math.max(0, (width - CROP_VIEW_SIZE) / 2);
  const maxY = Math.max(0, (height - CROP_VIEW_SIZE) / 2);
  return {
    x: Math.max(-maxX, Math.min(maxX, offset.x)),
    y: Math.max(-maxY, Math.min(maxY, offset.y)),
  };
}

export default function ProfileSettingsTab() {
  const { t } = useTranslation("settings");
  const { user: signedInUser, refreshUser } = useAuth();
  const [profile, setProfile] = useState(() => normalizeProfile(signedInUser));
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [cropSource, setCropSource] = useState(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [isCropping, setIsCropping] = useState(false);
  const [processingCrop, setProcessingCrop] = useState(false);
  const [loadingCropSource, setLoadingCropSource] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const fileInputRef = useRef(null);
  const cropDragRef = useRef(null);
  useBodyScrollLock(isCropping);

  useEffect(() => {
    let active = true;
    apiFetch("/profile")
      .then((response) => {
        if (active) setProfile(normalizeProfile(response?.data ?? response));
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.message || t("profile.loadError"));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [t]);

  useEffect(() => {
    if (!selectedPhoto) {
      setPreviewUrl(null);
      return undefined;
    }

    const objectUrl = URL.createObjectURL(selectedPhoto);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedPhoto]);

  useEffect(() => {
    if (!cropSource?.url) return undefined;
    return () => URL.revokeObjectURL(cropSource.url);
  }, [cropSource]);

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const input = event.currentTarget;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError(t("profile.imageTypeError"));
      input.value = "";
      return;
    }
    if (file.size > MAX_SOURCE_PHOTO_BYTES) {
      setError(t("profile.imageSizeError"));
      input.value = "";
      return;
    }

    setError("");
    setLoadingCropSource(true);
    const sourceUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      setLoadingCropSource(false);
      if (image.naturalWidth * image.naturalHeight > MAX_SOURCE_IMAGE_PIXELS) {
        URL.revokeObjectURL(sourceUrl);
        setError(t("profile.imageDimensionsError"));
        input.value = "";
        return;
      }

      setCropSource({
        url: sourceUrl,
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
      setCropZoom(1);
      setCropOffset({ x: 0, y: 0 });
      setIsCropping(true);
      input.value = "";
    };
    image.onerror = () => {
      setLoadingCropSource(false);
      URL.revokeObjectURL(sourceUrl);
      setError(t("profile.imageTypeError"));
      input.value = "";
    };
    image.src = sourceUrl;
  };

  const handleCancelCrop = () => {
    setIsCropping(false);
    setCropSource(null);
    cropDragRef.current = null;
  };

  const handleCropZoomChange = (event) => {
    const nextZoom = Number(event.target.value);
    setCropZoom(nextZoom);
    if (!cropSource) return;
    const layout = cropLayout(cropSource, nextZoom);
    setCropOffset((current) =>
      constrainCropOffset(current, layout.width, layout.height),
    );
  };

  const handleCropPointerDown = (event) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    cropDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      offset: cropOffset,
    };
  };

  const handleCropPointerMove = (event) => {
    if (!cropDragRef.current || !cropSource) return;
    const layout = cropLayout(cropSource, cropZoom);
    setCropOffset(
      constrainCropOffset(
        {
          x: cropDragRef.current.offset.x + event.clientX - cropDragRef.current.startX,
          y: cropDragRef.current.offset.y + event.clientY - cropDragRef.current.startY,
        },
        layout.width,
        layout.height,
      ),
    );
  };

  const handleCropPointerUp = () => {
    cropDragRef.current = null;
  };

  const handleApplyCrop = async () => {
    if (!cropSource) return;
    setProcessingCrop(true);
    setError("");

    try {
      const image = new Image();
      image.src = cropSource.url;
      await image.decode();

      const layout = cropLayout(cropSource, cropZoom);
      const canvas = document.createElement("canvas");
      canvas.width = CROP_OUTPUT_SIZE;
      canvas.height = CROP_OUTPUT_SIZE;
      const context = canvas.getContext("2d");
      if (!context) throw new Error(t("profile.cropError"));

      const left = CROP_VIEW_SIZE / 2 + cropOffset.x - layout.width / 2;
      const top = CROP_VIEW_SIZE / 2 + cropOffset.y - layout.height / 2;
      const sourceCropSize = CROP_VIEW_SIZE / layout.scale;
      const sourceX = Math.max(
        0,
        Math.min(cropSource.width - sourceCropSize, -left / layout.scale),
      );
      const sourceY = Math.max(
        0,
        Math.min(cropSource.height - sourceCropSize, -top / layout.scale),
      );

      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceCropSize,
        sourceCropSize,
        0,
        0,
        CROP_OUTPUT_SIZE,
        CROP_OUTPUT_SIZE,
      );

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (result) =>
            result ? resolve(result) : reject(new Error(t("profile.cropError"))),
          "image/jpeg",
          0.82,
        );
      });
      if (blob.size > MAX_PROFILE_PHOTO_BYTES) {
        throw new Error(t("profile.croppedImageSizeError"));
      }

      setSelectedPhoto(
        new File([blob], "profile-photo.jpg", {
          type: "image/jpeg",
          lastModified: Date.now(),
        }),
      );
      setRemovePhoto(false);
      setIsCropping(false);
      setCropSource(null);
      cropDragRef.current = null;
    } catch (cropError) {
      setError(cropError.message || t("profile.cropError"));
    } finally {
      setProcessingCrop(false);
    }
  };

  const handleRemovePhoto = () => {
    setSelectedPhoto(null);
    setRemovePhoto(Boolean(profile.profile_photo_url));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      const body = new FormData();
      body.append("name", String(profile.name ?? "").trim());
      body.append("username", String(profile.username ?? "").trim());
      body.append("email", String(profile.email ?? "").trim());
      body.append("phone", String(profile.phone ?? "").trim());
      if (selectedPhoto) body.append("profile_photo", selectedPhoto);
      if (removePhoto) body.append("remove_profile_photo", "1");

      const response = await apiFetch("/profile", {
        method: "POST",
        body,
      });
      setProfile(normalizeProfile(response?.data ?? response));
      setSelectedPhoto(null);
      setRemovePhoto(false);
      showToast.success(response?.message || t("profile.saved"));
      try {
        await refreshUser();
      } catch (refreshError) {
        console.error("Failed to refresh the signed-in user after profile update:", refreshError);
      }
    } catch (requestError) {
      const fieldError = requestError?.data?.errors
        ? Object.values(requestError.data.errors).flat().find(Boolean)
        : null;
      const message = fieldError || requestError.message || t("profile.saveError");
      setError(message);
      showToast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChanged = () => {
    setPasswordModalOpen(false);
    showToast.success(t("password.changed", { ns: "common" }));
    refreshUser().catch((refreshError) => {
      console.error("Failed to refresh the signed-in user after password change:", refreshError);
    });
  };

  const photoUrl = previewUrl || (removePhoto ? null : profile.profile_photo_url);
  const cropDisplay = cropSource ? cropLayout(cropSource, cropZoom) : null;

  return (
    <div className="space-y-3.5">
      <section className="bg-white rounded-card border border-gray-200 shadow-2xs overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <UserRound size={17} className="text-gray-500" />
            {t("navigation.profile", { ns: "common" })}
          </h2>
          <p className="text-caption-text text-gray-500 mt-1">{t("profile.subtitle")}</p>
        </div>

        {loading ? (
          <div className="p-8 flex items-center justify-center gap-2 text-sm text-gray-500" role="status">
            <LoaderCircle size={17} className="animate-spin" />
            {t("profile.loading")}
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-card border border-gray-200 bg-gray-50/70 p-4">
              <div className="w-20 h-20 rounded-full border border-gray-300 bg-white text-gray-400 flex items-center justify-center overflow-hidden shrink-0">
                {photoUrl ? (
                  <img src={photoUrl} alt={t("profile.photoAlt")} className="w-full h-full object-cover" />
                ) : (
                  <UserRound size={32} />
                )}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-bold text-gray-800">{t("profile.photoTitle")}</p>
                <p className="text-xs text-gray-500">{t("profile.photoHint")}</p>
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoChange}
                    className="sr-only"
                    aria-label={t("profile.choosePhoto")}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={saving || loadingCropSource}
                    className="inline-flex items-center gap-1.5 rounded-btn border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-60 cursor-pointer"
                  >
                    {loadingCropSource ? (
                      <LoaderCircle size={14} className="animate-spin" />
                    ) : (
                      <Camera size={14} />
                    )}
                    {loadingCropSource
                      ? t("profile.preparingImage")
                      : t("profile.choosePhoto")}
                  </button>
                  {(profile.profile_photo_url || selectedPhoto) && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 rounded-btn border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-60 cursor-pointer"
                    >
                      <Trash2 size={14} />
                      {t("profile.removePhoto")}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <p role="alert" className="rounded-card border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">
                {error}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <label className="space-y-1.5">
                <span className="block text-xs font-bold text-gray-700">{t("profile.name")}</span>
                <input
                  required
                  maxLength={150}
                  autoComplete="name"
                  value={profile.name}
                  onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
                  className={PROFILE_INPUT_CLASS}
                  disabled={saving}
                />
              </label>
              <label className="space-y-1.5">
                <span className="block text-xs font-bold text-gray-700">{t("profile.username")}</span>
                <input
                  required
                  maxLength={100}
                  autoComplete="username"
                  dir="ltr"
                  value={profile.username}
                  onChange={(event) => setProfile((current) => ({ ...current, username: event.target.value }))}
                  className={PROFILE_INPUT_CLASS}
                  disabled={saving}
                />
              </label>
              <label className="space-y-1.5">
                <span className="block text-xs font-bold text-gray-700">{t("profile.email")}</span>
                <input
                  required
                  type="email"
                  maxLength={150}
                  autoComplete="email"
                  dir="ltr"
                  value={profile.email}
                  onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))}
                  className={PROFILE_INPUT_CLASS}
                  disabled={saving}
                />
              </label>
              <label className="space-y-1.5">
                <span className="block text-xs font-bold text-gray-700">{t("profile.phone")}</span>
                <input
                  type="tel"
                  maxLength={50}
                  autoComplete="tel"
                  dir="ltr"
                  value={profile.phone || ""}
                  onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))}
                  className={PROFILE_INPUT_CLASS}
                  disabled={saving}
                />
              </label>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setPasswordModalOpen(true)}
                disabled={saving}
                className="inline-flex items-center justify-center gap-1.5 rounded-btn border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60 cursor-pointer"
              >
                <KeyRound size={15} />
                {t("password.changeButton", { ns: "common" })}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-1.5 rounded-btn bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-900 disabled:opacity-60 cursor-pointer"
              >
                {saving ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />}
                {saving
                  ? selectedPhoto
                    ? t("profile.uploading")
                    : t("actions.saving", { ns: "common" })
                  : t("profile.save")}
              </button>
            </div>
          </form>
        )}
      </section>

      <PasswordChangeModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        onDone={handlePasswordChanged}
      />
      {isCropping && cropSource && createPortal(
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-3 font-sans"
          dir="rtl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-photo-crop-title"
        >
          <div className="w-full max-w-md rounded-modal bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h3 id="profile-photo-crop-title" className="text-sm font-bold text-gray-900">
                {t("profile.cropTitle")}
              </h3>
              <button
                type="button"
                onClick={handleCancelCrop}
                disabled={processingCrop}
                aria-label={t("actions.close", { ns: "common" })}
                className="rounded-btn p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-60 cursor-pointer"
              >
                <X size={17} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-gray-600">{t("profile.cropHint")}</p>
              <div
                className="relative mx-auto overflow-hidden rounded-xl border border-gray-300 bg-slate-900 cursor-grab active:cursor-grabbing"
                style={{
                  width: CROP_VIEW_SIZE,
                  height: CROP_VIEW_SIZE,
                  touchAction: "none",
                }}
                onPointerDown={handleCropPointerDown}
                onPointerMove={handleCropPointerMove}
                onPointerUp={handleCropPointerUp}
                onPointerCancel={handleCropPointerUp}
              >
                <img
                  src={cropSource.url}
                  alt={t("profile.photoAlt")}
                  draggable="false"
                  className="pointer-events-none absolute max-w-none select-none"
                  style={{
                    width: cropDisplay.width,
                    height: cropDisplay.height,
                    left: `calc(50% + ${cropOffset.x}px)`,
                    top: `calc(50% + ${cropOffset.y}px)`,
                    transform: "translate(-50%, -50%)",
                  }}
                />
                <div className="pointer-events-none absolute inset-0 border-2 border-white/80" />
              </div>
              <label className="block space-y-1.5">
                <span className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                  <Move size={13} />
                  {t("profile.cropZoom")}
                </span>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.01"
                  value={cropZoom}
                  onChange={handleCropZoomChange}
                  className="w-full accent-slate-800"
                  aria-label={t("profile.cropZoom")}
                />
              </label>
              {error && (
                <p role="alert" className="rounded-card border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800">
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCancelCrop}
                  disabled={processingCrop}
                  className="rounded-btn border border-gray-300 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60 cursor-pointer"
                >
                  {t("actions.cancel", { ns: "common" })}
                </button>
                <button
                  type="button"
                  onClick={handleApplyCrop}
                  disabled={processingCrop}
                  className="inline-flex items-center gap-1.5 rounded-btn bg-slate-800 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-900 disabled:opacity-60 cursor-pointer"
                >
                  {processingCrop && <LoaderCircle size={14} className="animate-spin" />}
                  {t("profile.cropApply")}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
