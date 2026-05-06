
# Memorise Data Curation Tool — User Test Guide

**What we're testing:** The **user interface (UI)** of this data curation tool. The NLP models themselves (segmentation, NER, translation) are external APIs and **not** part of what we're evaluating - please don't rate the models. We want to know how well the UI lets you **correct and curate** what the models produce: are the controls discoverable, do the interactions feel natural, can you reach a satisfying result without getting stuck?
**What we need from you:** Do the tasks below on the transcript example we sent you, then export your workspace as JSON and fill out the short feedback form.

**About the transcript.** You'll be working with a short example from a Holocaust survivor testimony. It contains the material needed to exercise all features.

---

## TL;DR — the 7 steps

Skim this checklist first to get a sense of the whole flow, then scroll down for detailed instructions on each step.

1. **Sign in and create a workspace.** Paste the transcript excerpt we sent you.
2. **Auto-segment** the document with one click.
3. **Fix the segmentation** — merge, split, or shift boundaries until it feels right.
4. **Run NER and semantic tagging** on the whole document.
5. **Review entities and semantic tags** segment by segment; correct what the model got wrong.
6. **Translate one segment** into a language you read; try editing the translation.
7. **Export your workspace as JSON**, then fill out the short feedback form.

---

## Before you start

1. Open the app in a modern browser (Chrome,Firefox or Safari is recommended). URL will be shared with the invitation.
2. When you first sign in, you'll see **3 empty pre-seeded workspaces** in the sidebar. You're welcome to poke around them, but for the actual test **please create a new workspace of your own** — this keeps everyone's test session cleanly separated in what you send us. The sidebar shows up to 3 workspaces directly; once you have more than 3, a **+N** bubble appears that opens the **Manage Workspaces** page where you can find the rest.
3. **You do not need to start a timer.** The tool records when your workspace was created and when you exported it, so session duration is computed automatically from the JSON. Just work at a comfortable pace.
4. **You do not need to count your edits by hand.** The tool automatically tracks how many times you merge, split, or shift segments, and how many NER spans you create, delete, re-categorize, or edit. These numbers are included in the JSON export at the end.
5. **You do not need to save manually.** The tool **autosaves** your workspace to your browser's local storage as you work, so a crash or accidental tab close won't cost you progress. You can still click the **Save** icon in the top toolbar if you want to force a save, but it isn't required during normal use.
6. **Undo/redo is available** if you make a mistake, use to top toolbar to undo or redo your steps.
7. If anything **in the interface** breaks, confuses you, is hard to find, or behaves unexpectedly, note it down - that's the most valuable feedback.

> **Privacy note.** The transcript stays in your browser (`localStorage`). You can clear it at any time by deleting the workspace. Nothing is uploaded to a shared database.

---

## Step 1 — Sign in and create a workspace

1. On the login screen, enter any username (e.g. your first name) and click **Sign in**. There's no password — this is a UI affordance, not a security boundary.
2. You'll land on the app with 3 pre-seeded empty workspaces in the sidebar. **Create your own** by clicking the **+** (New Workspace) bubble in the left sidebar.
3. Give the workspace a name like `Test-<yourname>` and confirm.
4. Open the transcript example we sent you, copy it.
5. Paste the example into the editor placeholder ("Insert your document text here…"). (We are currently working on a feature that allows user to upload a whole file into the tool directly, but the current state should serve the demonstration purposes).

**Checkpoint:** You should see one large block of text, with a single segment containing everything you pasted.

---

## Step 2 — Auto-segment

1. In the top toolbar, click the **Auto-Segment** icon (looks like a forked arrow, blue).
2. Wait for the API to return. The text should split into many numbered sentence-like segments.
3. Take a quick look at the segmentation to get a feel for how it turned out.

**What to expect:** The transcript will split into roughly **25 segments**. Don't let the number overwhelm you — most segments are short because the speaker talks in fragments. Your job in Step 3 is to merge back the ones that clearly belong together.

**Note:** The "Auto-Segment" button will be greyed out after a successful run - this is expected, you can only auto-segment a document once.

---

## Step 3 — Fix segmentation in the UI

Go through the document and correct segmentation you disagree with. **The point is to exercise the UI's segmentation-editing tools** — merging, splitting, shifting boundaries - and see whether they feel natural to use.

Available actions (hover between two segments to reveal):

- **Merge two segments** -> click the small merge icon (double sided arrow ) that appears at the boundary between them. This joins the current segment with the one above it.
- **Shift the boundary between two segments** -> grab the drag handle (six dots) at the boundary and drop it inside either segment at the new boundary position.
- **Split a segment** -> select a delimeter (!  ?  .  -  ,  :  ) position inside the segment (highlight with a mouse) a floating menu will show (this action is only allowed in the original text view of a segment, to prevent misalignments and context loss), choose **"Split segment here"**.

---

## Step 4 — Run NER (Named Entity Recognition) and semantic tagging on the whole document

### 4a. Named entity recognition

1. Click the **Run NER** icon in the top toolbar (right next to the grayed out "run segmentation" button).
2. Wait for the API to finish. A **toast notification** will pop up confirming the NER run completed across the whole document.
3. The coloured highlights themselves only render inside the **currently active segment** - click on a segment to activate it and see its entities highlighted. Switch between segments to browse the recognised entities:
   - **Pink** - PER (Person)
   - **Blue** - DATE
   - **Green** - LOC (Location)
   - **Orange** - ORG (Organisation)
   - **Purple** - CAMP 
   - **Brown** - GHETTO
   - **Blue-grey** - MISC

**What to expect from NER:** You'll notice NER misses many obvious entities — that's expected, and correcting those in Step 5 is exactly the curation work this tool is built for.

If the API finds spans that conflict with anything you created, a **conflict dialog** will ask you to choose which to keep. Pick whichever is correct and continue.

### 4b. Semantic tagging

1. Click the **semantic tags / label** icon in the top toolbar (second to last icon) to open the tags panel on the right.
2. In the top toolbar a new sparkle wand icon button will appear (**Auto-Tag Document** ) click it to run semantic tagging. The API will assign hierarchical topic tags to segments based on their content.
3. Wait for the toast notification confirming the run completed.
4. The right-hand panel lists all assigned tags; activating individual segments will filter out its coresponding semantic tags.

**What to expect from semantic tagging:** The model typically assigns a handful of topic tags drawn from a MEMORISE thesaurus (e.g. *migration*, *family*, *persecution*, *displacement*, *post-war experience*). Don't worry about tag accuracy at this stage - you'll have the option to correct or add tags in Step 5 as you browse the segments.

---

## Step 5 — Review and correct NER spans and semantic tags

Work through every segment and make both the entities and the semantic tags look right. The goal here is to **exercise the span- and tag-editing UI** — clicking existing spans, selecting text to create new ones, picking categories from the popup menu, editing span text in the input, adding/removing semantic tags. Please do this for **every** segment, not only a few — that's what gives us comparable data across testers.

### NER actions

- **Delete a wrong span** -> click the highlighted span, then click the red trash icon in the popup menu.
- **Change a span's category** (e.g. CAMP -> LOC) -> click the span, choose the correct category from the popup.
- **Edit the text of a span** (e.g. API caught "Auschwitz" but missed the "-Birkenau" suffix) -> click the span and edit the text in the popup input.
- **Add a new span** -> select the text with your mouse, release, then pick a category from the floating menu that appears.


### Semantic tags

While you're moving through segments doing NER review, also review the semantic tags that were assigned in Step 4b.

- **Add a tag to a segment** -> open the tags panel by clicking the sem-tag icon in the toolbar or in the segment header, search the thesaurus for a relevant term, and assign it to the currently active segment. The input searches the **MEMORISE thesaurus by default**; if the term you want isn't in the thesaurus, toggle to **Free Text** mode using the button in the tag panel header to add your own tag.
- **Remove a misassigned tag** -> click the small **x** on the tag chip in the segment panel to remove it from the tags list.

> **Note.** The right-hand tag panel switches scope based on what's active. With a segment active, it shows **Segment Tags** for that segment; with no segment active (click outside any segment to deactivate), it shows **Document Tags** — so make sure you're tagging the segment you intend to.

---

## Step 6 — Translate a segment

**Focus in this step is the translation UI flow** — adding a translation layer, switching between layers, editing translations, and the re-translate confirmation flow. Don't worry about how good the translation itself is.

1. Pick the segment with the **most NER spans or semantic tags** (or one of them if there are several) — activating a segment now opens its translation toolbar automatically. You can still use the chevron **v** on the top-right of the segment header to collapse or re-open it manually.
2. Click the **+** button in the segment header. A language list opens.
3. Pick a target language you read fluently (the source is in English, so pick something else you can judge).
4. Wait for the translation to appear.
5. Use the language dropdown in the segment header to switch between **Original Text** and **Translation: [LANG]**.
6. Click directly into the translated text and **fix any translation errors** you can spot — automatic translations of historical testimonies often miss filler words, mistranslate proper nouns, or include editor in-line notes. A small **"Edited"** badge appears once you make a change — note this UI affordance.
7. Try the **Sync** icon (re-translate). On an edited segment, it now opens a **confirmation dialog** warning you that re-translating will overwrite your edits. Check whether the wording feels clear; cancel to keep your edits, confirm to overwrite.
8. **Translate the whole document** -> click the **Translate Document** icon in the top toolbar (translate icon, orange), pick a language different from the one in step 3, wait for it to finish (this might take a while), then switch between layers in a segment to confirm both translations coexist cleanly.
9. **Run NER on a translated segment** -> with a segment switched to its translation, click the **Run NER on segment** icon in the segment header. Switch back and forth between languages and check the entity layers coexist cleanly. This tests the **layered-annotation UI**.

> **Note.** **Translate segment** (the **+** button) always translates the **original** text — not the currently open translation. So if you switch the dropdown to a translation and click **+** to add another language, the new translation is still produced from the English source.

---

## Step 7 — Export your workspace

Your workspace has been autosaved throughout the session, so you can export directly without needing to save first.

1. From the workspace itself, click the **export** action in the top toolbar and choose **JSON (<>)**.
2. Save the file somewhere you can find it — you'll attach it to the feedback form in Step 8.
3. Also try exporting as **PDF** from the same menu — check whether it looks like something you'd hand to a colleague.

The JSON contains everything needed for us to analyse the session: your final segments, entities, translations, and the automatic edit counters (how many segments you joined/split/shifted, and how many NER spans you created/deleted/re-categorised). No manual reporting needed.

---

## Step 8 — Send us the results

Please send us two things:

1. **The exported JSON file** from Step 7 - attach it to the feedback form (or email it to [adam.turcan@drake.sk]).
2. **The feedback form** — link in the invitation email.

---

## Additional checks

Please also run through these to exercise the tool's resilience and workspace-management features, and note what surprised you:

- **Try undo/redo mid-task** — make a few merges or NER edits, then mash the undo/redo buttons in the top toolbar and see whether the UI keeps up.
- **Refresh the browser** mid-session — everything should still be there thanks to **autosave** (workspace state lives in `localStorage`). Confirm this.
- **Rename your workspace** from the **Manage Workspaces** page — there's an edit (pencil) button next to each workspace name.
- **Open the same workspace in a second browser tab** — does it behave sanely? (real-time syncing between tabs isn't implemented yet, so the two tabs may diverge until you refresh. We're aware of this and are working on a fix.)

---

## FAQ / troubleshooting

- **An action did nothing and I don't see an error.** Open the browser DevTools (F12) -> Console tab. If you see red errors mentioning CORS or `Failed to fetch`, screenshot it and include it in the feedback form.
- **The document is segmented and "Auto-Segment" is greyed out.** That's correct — auto-segment only works on a single-segment document. Merge everything back or start a new workspace to re-run.
- **Re-translation overwrites my edits.** When you click **Sync** on a segment that shows the orange "Edited" badge, you'll get a confirmation dialog warning you that re-translating will overwrite your manual edits. Cancel to keep your edits, confirm to replace them with a fresh API translation.
- **I lost my work.** The tool **autosaves** your workspace to your browser's `localStorage` as you work, so normal refreshes, crashes, and accidental tab closes should be recoverable. However, clearing cookies/site data, using a private/incognito window, or opening the app in a different browser profile will still wipe it — those aren't covered by autosave.


Thanks for testing :).
