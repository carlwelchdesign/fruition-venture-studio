import {
  addNoteAction,
  archiveIdeaAction,
  moveIdeaAction,
  setDispositionAction,
} from "@/app/admin/actions";
import styles from "@/app/admin/admin.module.css";

type IdeaSidebarProps = {
  idea: {
    id: string;
    disposition: string | null;
    nameSnapshot: string;
    emailSnapshot: string;
    notes: Array<{
      id: string;
      body: string;
      createdAt: Date;
      author: { name: string };
    }>;
  };
};

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function IdeaSidebar({ idea }: IdeaSidebarProps) {
  return (
    <aside className={styles.detailAside}>
      <section className={styles.sidePanel}>
        <h2>Decision</h2>
        <form className={styles.stackedForm} action={setDispositionAction}>
          <input type="hidden" name="ideaId" value={idea.id} />
          <label>
            Disposition
            <select
              name="disposition"
              defaultValue={idea.disposition ?? ""}
              required
            >
              <option value="" disabled>
                Choose
              </option>
              <option value="EXPLORE">Explore</option>
              <option value="HOLD">Hold</option>
              <option value="DECLINE">Decline</option>
            </select>
          </label>
          <label>
            Decision reason
            <textarea name="reason" rows={3} required />
          </label>
          <button type="submit">Record decision</button>
        </form>
      </section>

      <section className={styles.sidePanel}>
        <h2>Private notes</h2>
        <form className={styles.stackedForm} action={addNoteAction}>
          <input type="hidden" name="ideaId" value={idea.id} />
          <label>
            Note
            <textarea
              name="body"
              rows={4}
              required
              placeholder="Add context, a follow-up, or your judgment…"
            />
          </label>
          <button type="submit">Add note</button>
        </form>
        <div className={styles.notes}>
          {idea.notes.map((note) => (
            <article key={note.id}>
              <p>{note.body}</p>
              <span>
                {note.author.name} · {dateTimeFormatter.format(note.createdAt)}
              </span>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.sidePanel}>
        <h2>Grouping correction</h2>
        <p>Move this idea if the submitter used a different email identity.</p>
        <form className={styles.stackedForm} action={moveIdeaAction}>
          <input type="hidden" name="ideaId" value={idea.id} />
          <label>
            Name
            <input name="name" defaultValue={idea.nameSnapshot} required />
          </label>
          <label>
            Email
            <input
              name="email"
              type="email"
              defaultValue={idea.emailSnapshot}
              required
            />
          </label>
          <label>
            Reason
            <input name="reason" required />
          </label>
          <button type="submit">Move idea</button>
        </form>
      </section>

      <section className={styles.sidePanel}>
        <h2>Archive</h2>
        <form className={styles.stackedForm} action={archiveIdeaAction}>
          <input type="hidden" name="ideaId" value={idea.id} />
          <label>
            Reason
            <input name="reason" required />
          </label>
          <button className={styles.quietButton} type="submit">
            Archive idea
          </button>
        </form>
      </section>
    </aside>
  );
}
