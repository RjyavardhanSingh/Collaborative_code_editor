/**
 * Custom binding between Monaco editor and ShareDB
 */
export class MonacoShareDBBinding {
  constructor(shareDBDoc, editor) {
    this.shareDBDoc = shareDBDoc;
    this.editor = editor;
    this.model = editor.getModel();
    this.isUpdatingShareDB = false;
    this.isUpdatingMonaco = false;
    this.isDestroyed = false;

    // Enhanced cursor preservation with local cursor tracking
    this.preservedCursors = new Map();
    this.isRestoringCursors = false;
    this.localCursorPosition = null; // Track local cursor separately

    this.syncInitialContent();
    this.initListeners();
  }

  syncInitialContent() {
    const docContent = this.shareDBDoc.data?.content || "";
    const editorContent = this.model.getValue();

    // If the content is different and ShareDB has content, update editor
    if (docContent && docContent !== editorContent) {
      this.isUpdatingMonaco = true;
      this.editor.executeEdits("sharedb-init", [
        {
          range: this.model.getFullModelRange(),
          text: docContent,
          forceMoveMarkers: true,
        },
      ]);
      this.isUpdatingMonaco = false;
    }
    // If ShareDB is empty but editor has content, update ShareDB
    else if (!docContent && editorContent) {
      this.isUpdatingShareDB = true;
      this.shareDBDoc.submitOp([{ p: ["content"], oi: editorContent }], {
        source: "monaco-init",
      });
      this.isUpdatingShareDB = false;
    }
  }

  // Enhanced method to save ONLY remote cursor decorations (not local cursor)
  saveAllCursors() {
    if (this.isRestoringCursors) return new Map();

    const cursors = new Map();

    // CRITICAL: Save local cursor position separately
    const localPosition = this.editor.getPosition();
    const localSelection = this.editor.getSelection();

    if (localPosition && localSelection) {
      this.localCursorPosition = {
        position: localPosition,
        selection: localSelection,
        timestamp: Date.now(),
      };
      console.log(
        `💾 Saved local cursor at line ${localPosition.lineNumber}, column ${localPosition.column}`
      );
    }

    // Get all current decorations
    const decorations = this.model.getAllDecorations();

    decorations.forEach((decoration) => {
      // Look for remote cursor decorations only (not local user)
      if (
        decoration.options.className &&
        decoration.options.className.includes("remote-cursor-") &&
        !decoration.options.className.includes("local-cursor") // Exclude local cursor decorations
      ) {
        const classMatch =
          decoration.options.className.match(/remote-cursor-(\w+)/);
        if (classMatch) {
          const userId = classMatch[1];
          cursors.set(userId, {
            range: decoration.range,
            options: decoration.options,
            id: decoration.id,
          });
        }
      }
    });

    this.preservedCursors = cursors;
    console.log(
      `💾 Saved ${cursors.size} remote cursors (excluding local cursor)`
    );
    return cursors;
  }

  // Enhanced method to restore cursors after content update
  restoreAllCursors(cursors = null) {
    const cursorsToRestore = cursors || this.preservedCursors;

    if (cursorsToRestore.size === 0 && !this.localCursorPosition) return;

    // Set restoration flag to prevent conflicts
    this.isRestoringCursors = true;

    console.log(
      `🔄 Restoring ${cursorsToRestore.size} remote cursors + local cursor`
    );

    // CRITICAL: Restore local cursor position first
    if (this.localCursorPosition) {
      try {
        console.log(
          `🔄 Restoring local cursor to line ${this.localCursorPosition.position.lineNumber}`
        );

        // Restore cursor position
        this.editor.setPosition(this.localCursorPosition.position);

        // Restore selection if it was a selection
        if (
          this.localCursorPosition.selection &&
          !this.localCursorPosition.selection.isEmpty()
        ) {
          this.editor.setSelection(this.localCursorPosition.selection);
        }

        console.log(`✅ Local cursor restored successfully`);
      } catch (err) {
        console.error("❌ Failed to restore local cursor:", err);
      }
    }

    // Dispatch event for remote cursors only
    if (cursorsToRestore.size > 0) {
      const event = new CustomEvent("restore-remote-cursors", {
        detail: {
          cursors: Array.from(cursorsToRestore.entries()).map(
            ([userId, cursorData]) => ({
              userId,
              range: cursorData.range,
              options: cursorData.options,
            })
          ),
          timestamp: Date.now(),
        },
      });

      document.dispatchEvent(event);
    }

    // Reset flag after a short delay
    setTimeout(() => {
      this.isRestoringCursors = false;
      this.localCursorPosition = null; // Clear saved position
      console.log("✅ Cursor restoration completed");
    }, 100);
  }

  initListeners() {
    // Listen for changes in Monaco editor
    this.modelChangeDisposable = this.model.onDidChangeContent((event) => {
      if (this.isUpdatingMonaco || this.isDestroyed) return;

      this.isUpdatingShareDB = true;

      try {
        const content = this.model.getValue();

        console.log("📤 Monaco -> ShareDB:", {
          contentLength: content.length,
          changeLength: event.changes.reduce(
            (acc, change) => acc + change.text.length,
            0
          ),
        });

        this.shareDBDoc.submitOp(
          [{ p: ["content"], od: this.shareDBDoc.data?.content, oi: content }],
          { source: "monaco" }
        );
      } catch (err) {
        console.error("Error updating ShareDB from Monaco:", err);
      } finally {
        this.isUpdatingShareDB = false;
      }
    });

    // Enhanced ShareDB listener with improved cursor preservation
    this.opHandler = (op, source) => {
      if (this.isUpdatingShareDB || this.isDestroyed || source === "monaco")
        return;

      try {
        console.log("📥 ShareDB -> Monaco:", { op: op?.length, source });

        if (
          this.shareDBDoc.data &&
          typeof this.shareDBDoc.data.content === "string"
        ) {
          const content = this.shareDBDoc.data.content;
          const editorContent = this.model.getValue();

          if (content !== editorContent) {
            this.isUpdatingMonaco = true;

            // CRITICAL: Save cursors with proper local/remote distinction
            const savedCursors = this.saveAllCursors();
            console.log(
              `💾 Content update from ${source}, saved ${savedCursors.size} remote cursors + local position`
            );

            // Update Monaco editor content
            this.editor.executeEdits("sharedb", [
              {
                range: this.model.getFullModelRange(),
                text: content,
                forceMoveMarkers: true,
              },
            ]);

            // CRITICAL: Restore cursors with proper timing
            setTimeout(() => {
              console.log("🔄 Restoring cursors after content update");
              this.restoreAllCursors(savedCursors);
            }, 50);

            this.isUpdatingMonaco = false;
          }
        }
      } catch (err) {
        console.error("Error updating Monaco from ShareDB:", err);
        this.isUpdatingMonaco = false;
      }
    };

    this.shareDBDoc.on("op", this.opHandler);
  }

  destroy() {
    this.isDestroyed = true;

    if (this.modelChangeDisposable) {
      this.modelChangeDisposable.dispose();
    }

    if (this.shareDBDoc) {
      this.shareDBDoc.removeListener("op", this.opHandler);
    }

    // Clear preserved cursors and local position
    this.preservedCursors.clear();
    this.localCursorPosition = null;
    this.isRestoringCursors = false;
  }
}
