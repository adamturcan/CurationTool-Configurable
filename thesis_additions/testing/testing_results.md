---
title: "Stakeholder Testing Results"
geometry: margin=1in
fontsize: 11pt
documentclass: article
colorlinks: true
header-includes:
 - \usepackage{float}
 - \usepackage{booktabs}
 - \let\origfigure\figure
 - \let\endorigfigure\endfigure
 - \renewenvironment{figure}[1][2]{\expandafter\origfigure\expandafter[H]}{\endorigfigure}
---

# Stakeholder Testing Results

This document reports the aggregate results of the stakeholder review summarised in Section 5.6 of the thesis. Eleven reviewers from the MEMORISE consortium and adjacent institutions completed the structured testing protocol on the live deployment at `https://curation-tool.memorise.sdu.dk` between April 23 and May 5, 2026, working with the same example transcript and the same step-by-step companion page. Each session produced a JSON export from the platform together with a four-section feedback form combining Likert-style ratings on the main UI affordances with open-text prompts. The form distinguished UI evaluation (controls, interactions, layout) from NLP evaluation (recall and precision of the model output) and asked reviewers to address only the former; the platform's stated contribution is the curation interface, and conflating it with the NLP pipeline would mix two independently configurable concerns.

## 1. Demographics and Coverage

The reviewer pool covered a mix of academic and engineering backgrounds, including computer scientists, computational linguists, and tooling-adjacent roles. Browsers were predominantly Chrome (n=7), with Firefox (n=3) and Safari (n=1) also represented. Coverage of the optional UI affordances was high.

| Feature | Reviewers who exercised it |
|---|---|
| Translation UI (any) | 11 of 11 |
| Translation UI: single segment + whole document | 7 of 11 |
| Semantic tagging panel: actively reviewed or edited tags | 8 of 11 |
| Semantic tagging panel: glanced only | 2 of 11 |
| Semantic tagging panel: ran auto-tag and moved on | 1 of 11 |

All reviewers performed the mandatory parts of the protocol (workspace creation, segmentation, NER, translation, tag review, export) in full. The translation flow was thus exercised end-to-end by every reviewer, and the semantic tagging flow was actively engaged with by a clear majority.

## 2. Overall UI Experience

The form opened with three high-level Likert questions on satisfaction, cognitive load, and intent to use. Distributions and means are reported below over n=11 responses.

| Question | Mean | Distribution (1-5) |
|---|---|---|
| Overall satisfaction with the curation interface | 4.27 | 3:1, 4:6, 5:4 |
| Cognitive effort to operate the UI (1=very easy, 5=very hard) | 2.09 | 1:3, 2:6, 4:2 |
| Likelihood to use for real work (assuming reliable APIs) | 4.45 | 2:1, 4:3, 5:7 |

Two readings stand out. First, satisfaction is consistently positive: no rating below 3, no neutral cluster, and a clean lean toward 4 and 5. Second, cognitive effort is rated low for nine of eleven reviewers (1 or 2 on a five-point scale), with two outliers at 4. The combination is interpretable as a UI that most reviewers find easy to operate, with two reviewers reporting that learning the interaction model required noticeable effort. The likelihood-to-use rating is the strongest single quantitative signal in the form, with seven of eleven reviewers selecting 5 and ten of eleven selecting 4 or above.

## 3. Per-Feature Clarity and Ease of Use

Section 3 of the form rated the clarity or ease of ten distinct UI surfaces on a one-to-five scale, where 1 means very hard or confusing and 5 means very easy or clear. The full distribution is reported below.

| Feature | n | Mean | Distribution (1-5) |
|---|---|---|---|
| Ease of creating a workspace and pasting text | 11 | 4.91 | 4:1, 5:10 |
| Clarity of the top toolbar | 11 | 4.27 | 4:8, 5:3 |
| Clarity of the per-segment header | 11 | 4.45 | 4:6, 5:5 |
| Ease of editing segmentation (merge / split / shift) | 11 | 3.73 | 3:5, 4:4, 5:2 |
| Ease of correcting NER spans | 10 | 4.20 | 2:1, 3:1, 4:3, 5:5 |
| Clarity of the NER category colours | 11 | 4.82 | 4:2, 5:9 |
| Clarity of the semantic tagging panel | 11 | 3.82 | 3:5, 4:3, 5:3 |
| Clarity of the per-segment translation controls | 11 | 4.09 | 2:1, 3:2, 4:3, 5:5 |
| Ease of moving between layers (original vs. translation) | 11 | 4.18 | 2:1, 3:2, 4:2, 5:6 |
| Ease of exporting workspace as JSON | 11 | 4.91 | 4:1, 5:10 |

The strongest ratings are concentrated on the start-to-end workflow boundaries (workspace creation 4.91, JSON export 4.91) and on the entity colour palette (4.82). The two weakest ratings are the segmentation-editing controls (3.73) and the semantic tagging panel (3.82), where the distributions tilt toward 3 rather than the otherwise dominant 4 and 5. The mid-range scores on translation controls (4.09) and layer switching (4.18) are accompanied by a tail of one or two low scores, consistent with the qualitative theme of parallel-view friction reported in Section 5.

## 4. Specific UI Moments

Section 4 of the form asked closed questions about distinct UI moments that reviewers might or might not have triggered. The percentages below are over reviewers who could plausibly have encountered each moment.

| UI moment | Result |
|---|---|
| **Edited badge + locked re-translate** | 3 understood from the UI; 2 noticed but unsure of meaning; 2 found the UI unclear; 4 did not try |
| **Conflict resolution dialog** | 3 saw it and found it clear; 8 never saw it (no conflicting NER reruns) |
| **Drag-to-shift-boundary interaction** | 2 intuitive; 3 OK after instructions; 4 confusing; 2 did not try |
| **Span editing popup (select vs. click)** | 6 clear with distinct flows; 3 slightly confusing (sometimes the wrong popup); 2 did not use |
| **Undo / redo in the toolbar** | 8 used and behaved as expected; 2 did not notice the buttons; 1 did not need them |
| **Autosave trustworthy** | 5 stopped thinking about saving; 5 neutral; 1 wanted a visible saved indicator |

The drag-to-shift interaction is the single biggest red flag in this section. Four reviewers explicitly described it as confusing, and two more skipped it altogether, leaving fewer than half the pool comfortable with the interaction as built. The span editing popup had a smaller version of the same effect, with three reviewers reporting they sometimes received the wrong popup. The Edited-badge UI was evenly split between reviewers who understood the lock-out and reviewers who did not, suggesting the affordance communicates the rule it enforces without yet making its purpose self-evident.

The conflict resolution dialog was well-received by reviewers who reached it, but most did not, because the protocol did not force a re-NER pass over an already-annotated segment.

## 5. Open Feedback: Convergent Themes

The open-text questions yielded substantial qualitative content. Five themes recur across multiple independent respondents.

### 5.1 Parallel-view translation editing (n=4 reviewers)

The most strongly convergent gap. Four reviewers independently asked for a parallel-view layout displaying the original segment text and its current translation side by side, on the grounds that automatic translations contain corrections that are easier to make against the source visible at the same time.

> *"As improvement could be added original text within a bubble showed over of the translated one. During corrections I made, it was required to switch between languages a bit often."* (R1)

> *"Perhaps viewing the original text and translated texts next to each other. The Dutch version had quite some mistakes, editing this is quite a nuisance if you have to keep switching back and forth between the two texts."* (R3)

> *"I think the translation editing view is not really functional in this way, as anybody who ever translated text will tell you, you need a parallel view. Clicking back and forth is extremely inefficient. I would propose to produce an option of a parallel view between selected pair of the original on the resulting translation."* (R4)

> *"Translation UI is recommended to be redone in a way that allows side-by-side comparison... swapping between languages for checking slows down the work significantly."* (R8)

### 5.2 Document-level operation visibility (n=4)

Reviewers reported hesitation when global actions did not produce immediate visible feedback in the active segment, and noted that the auto-tag affordance appears outside the panel where reviewers expect to find it.

> *"I struggled with understanding the functional differences of applying analysis on the document as a whole and in detail."* (R4)

> *"NER tags not displayed on unhighlighted segments were counter-intuitive."* (R7)

> *"Auto-tagging the document was a bit confusing. Initially, when you open the tag panel its empty and it's not immediately clear the auto-tagging option pops up as a new feature. Perhaps this feature would be more noticeable when the wand icon is located in the tag panel rather than in the main panel."* (R3)

> *"NER can be done whole document at once, semantic tagging one has to click through each segment."* (R7, surfacing the per-segment-vs-global asymmetry)

### 5.3 Boundary editing UX (n=3+)

The drag-handle for boundary shifting was confusing to multiple reviewers, consistent with the closed question result above.

> *"The segment boundary-editing was very counterintuitive, I am still not sure if I operationalized it properly."* (R3)

> *"The boundary setting function for segmentation modification is confusing to understand... I was not sure which set of buttons on the segments merging and boundary selection belongs to which segment. I was constantly clicking on the wrong one."* (R4)

> *"Drag-to-change boundary"* (R6, listed as the single thing they would change)

### 5.4 Span editing limitations (n=2)

Two reviewers noted that adjusting the boundaries of an existing entity span requires deletion plus re-creation rather than direct editing, which complicates corrections of slightly mis-recognised spans.

> *"With NER, span modifications was also unclear, I ended up always deleting the original annotation and re-annotating the span manually from scratch."* (R4)

> *"If you want to make the span larger, I couldn't find how to do it, I had to delete the NER tag and create a new one with the right span."* (R7)

### 5.5 Visible button labels rather than icons alone (n=2)

Two reviewers, including one who works closely with non-technical users, asked for explicit text labels alongside or in place of the toolbar icons.

> *"Instead of picture icons with text tool tips, I would prefer to have visible text at all times."* (R2)

> *"More clarity. The interface is very button-intense. For me as a CS no problem, but for non-IT people this could be a problem. Why not make it explicit what the individual buttons mean. There is space to write NER, Translate, ... besides the button/s."* (R9)

This sits in productive tension with another convergent finding: multiple reviewers cited the iconography itself as a strength of the interface (Section 6).

## 6. Open Feedback: Convergent Positives

The "what did you like most" prompt elicited a clear pattern. Of eleven responses, ten were positive and substantive, and three independent themes recurred.

### Visual cleanliness and density balance

> *"Nice and easy to look at... kind of un-messy, even though all the features needed is there."* (R5)

> *"Good balance between overview and functionality. It is not cluttered at all even with quite a large feature set."* (R6)

> *"Most of the workspace is occupied by text and other tools do not take much of the precious space for skimming over the text. The picked color scheme of UI and tags is not irritating and might work for longer sessions."* (R8)

### Iconography and visual layout

> *"Clear iconography, lot of options to work in several parallel workflows at once, the idea of manual text segmentation editing is awesome, nice visual layout in general."* (R4)

> *"Colors after running NER function."* (R11)

### Hybrid-automation workflow philosophy

> *"I can really see the benefits of the UI to people who work with oral history interviews or longer 'personal' texts in general... The ability to partially automate but still edit the NER and tags saves a lot of work while retaining the option to edit/add specific items relevant to your research."* (R3)

> *"Its simplicity. You can (and should be able to) operate the tool without guidance. This is the strength of the tool."* (R9)

### Speed and responsiveness

> *"It is super fast, the ability to see and add new NER tags is amazing."* (R7)

The pattern is consistent across eleven reviewers from heterogeneous backgrounds: the platform is perceived as fast, visually clean, and well-suited to the partial-automation workflow that the consortium practises in real curation work.

## 7. Identified Defects

Two interaction defects were identified across the eleven sessions and are scheduled for follow-up alongside the future-work items in the Conclusion.

The first concerns the re-translation warning dialog described in Use Case UC-15. One reviewer reported that the per-segment Sync action overwrote manual edits on the translated layer without first triggering the confirmation step.

> *"I didn't get this: Try the Sync icon (re-translate). On an edited segment, it now opens a confirmation dialog warning you that re-translating will overwrite your edits... it just deleted my changes back to the poor translation."* (R5)

The second concerns the entity edit popup snippet. After running NER on a translation layer, the popup on the original layer began to display partial translation text rather than the original surface form of the span.

> *"I might have taken the wrong steps here, but I was testing whether running the NER would also work on the translated texts. However, after using this feature, it messed up the text visible in the pop-up display for the original text (e.g. I translated it to Dutch, ran the NER again on the Dutch text, the pop up texts in the original text for the first NER 'Melbourne High' now reads a partial Dutch text 'voor Melbourne'). It is still possible to manually edit it."* (R3)

A smaller third item was reported in passing: the thesaurus search returns no matches for queries that exactly equal an existing thesaurus entry of the same length, while shorter prefixes of the same query do return matches. This is a Fuse.js scoring boundary at the upper edge of the threshold parameter, addressable by a pre-check for exact match before delegating to the fuzzy-search path.

> *"The thesaurus search is struggling to give a perfect match (encountered with children's occupations); until you give it only a partial string, it finds the tag successfully, once input a 100% matching string, it gives out zero results."* (R3)

All three defects are confined to the presentation layer, do not affect the architectural seams that the thesis claims, and are listed in the future-work plan of the Conclusion.

## 8. Summary

Across eleven reviewers, the platform was rated positively on overall satisfaction (mean 4.27), strongly positive on likelihood-to-use for real curation work (mean 4.45, with seven of eleven selecting 5), and predominantly low on cognitive effort to operate (mean 2.09, with nine of eleven at 1 or 2). Per-feature ratings were strongest on workspace creation, named entity colour clarity, and JSON export, where modal answers concentrated at 5. The two weakest features were the manual segmentation-editing controls (mean 3.73) and the semantic tagging panel (mean 3.82), with the qualitative comments converging on the boundary-shift drag handle and the auto-tag wand placement as the specific pain points.

The most actionable convergent finding is the request for a parallel-view layout in translation post-editing, raised independently by four of eleven reviewers and supported by the lower scores on layer switching. The visual cleanliness of the interface, the partial-automation workflow philosophy, and the platform's responsiveness emerged as convergent positives across the open-text responses. Two interaction defects, plus a thesaurus-search scoring edge case, were identified and recorded for follow-up.
