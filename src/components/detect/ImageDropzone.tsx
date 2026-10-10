import { useId, useState, type ChangeEvent, type DragEvent } from "react";
import { FILE_LIMITS } from "../../services/api";

interface Props {
  file: File | null;
  previewUrl: string | null;
  disabled?: boolean;
  onFile: (file: File | null) => void;
}

export function ImageDropzone({ file, previewUrl, disabled, onFile }: Props) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    const next = files?.[0] ?? null;
    onFile(next);
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    handleFiles(event.dataTransfer.files);
  };

  return (
    <div>
      <label
        htmlFor={inputId}
        className={`dropzone ${dragging ? "dragging" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <strong>Drop a wheat-leaf image here</strong>
        <p>
          or choose a JPEG, PNG, or WEBP file up to {FILE_LIMITS.maxBytes / (1024 * 1024)} MB.
        </p>
        <input
          id={inputId}
          type="file"
          accept={FILE_LIMITS.acceptedTypes.join(",")}
          hidden
          disabled={disabled}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </label>
      {previewUrl ? (
        <div className="preview-frame" style={{ marginTop: 16 }}>
          <img src={previewUrl} alt={file ? `Preview of ${file.name}` : "Selected leaf"} />
        </div>
      ) : null}
      {file ? <p className="muted">{file.name}</p> : null}
    </div>
  );
}
