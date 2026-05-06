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

This document reports the aggregate results of the stakeholder review summarised in Section 5.6 of the thesis. Eleven reviewers from the MEMORISE consortium and adjacent institutions completed the testing protocol on the live deployment at `https://curation-tool.memorise.sdu.dk` between April 23 and May 5, 2026, all working from the same example transcript and the same step-by-step companion page. Each session produced a JSON export and a four-section feedback form: Likert ratings on the main UI affordances, plus open-text prompts. The form intentionally asked about the UI (controls, interactions, layout) and not the NLP output, since the two are independently configurable and would otherwise be evaluated together.

## 1. Demographics and Coverage

The reviewer pool covered a mix of academic and engineering backgrounds, including computer scientists, computational linguists, and tooling-adjacent roles. Browsers were predominantly Chrome (n=7), with Firefox (n=3) and Safari (n=1) also represented. Coverage of the optional UI affordances was high.

| Feature | Reviewers who exercised it |
|---|---|
| Translation UI (any) | 11 of 11 |
| Translation UI: single segment + whole document | 7 of 11 |
| Semantic tagging panel: actively reviewed or edited tags | 8 of 11 |
| Semantic tagging panel: glanced only | 2 of 11 |
| Semantic tagging panel: ran auto-tag and moved on | 1 of 11 |

Every reviewer ran through the mandatory steps end-to-end: workspace creation, segmentation, NER, translation, tag review, and export. Translation was therefore exercised by all eleven; the semantic tagging panel was actively used by eight, glanced at by two, and used as an auto-tag-and-move-on shortcut by one.

## 2. Overall UI Experience

The form opened with three high-level Likert questions on satisfaction, cognitive load, and intent to use. Distributions and means are reported below over n=11 responses. The Distribution column reports the number of reviewers who selected each rating from 1 to 5, in that order, separated by hyphens; for example, `0-0-1-6-4` means no reviewer picked 1 or 2, one picked 3, six picked 4, and four picked 5. The same convention applies to the per-feature distributions in Section 3.

| Question | Mean | Distribution (1-5) |
|---|---|---|
| Overall satisfaction with the curation interface | 4.27 | 0-0-1-6-4 |
| Cognitive effort to operate the UI (1=very easy, 5=very hard) | 2.09 | 3-6-0-2-0 |
| Likelihood to use for real work (assuming reliable APIs) | 4.45 | 0-1-0-3-7 |

Satisfaction stayed positive across the pool. No reviewer rated below 3, and the distribution leans cleanly toward 4 and 5. Cognitive effort sits at the low end too — nine of eleven reviewers picked 1 or 2, with two outliers at 4 who reported that learning the interaction model took noticeable effort. The likelihood-to-use question gave the cleanest signal: seven reviewers picked 5, three picked 4, and one picked 2.

## 3. Per-Feature Clarity and Ease of Use

Section 3 of the form rated the clarity or ease of ten distinct UI surfaces on a one-to-five scale, where 1 means very hard or confusing and 5 means very easy or clear. The full distribution is reported below.

| Feature | n | Mean | Distribution (1-5) |
|---|---|---|---|
| Ease of creating a workspace and pasting text | 11 | 4.91 | 0-0-0-1-10 |
| Clarity of the top toolbar | 11 | 4.27 | 0-0-0-8-3 |
| Clarity of the per-segment header | 11 | 4.45 | 0-0-0-6-5 |
| Ease of editing segmentation (merge / split / shift) | 11 | 3.73 | 0-0-5-4-2 |
| Ease of correcting NER spans | 10 | 4.20 | 0-1-1-3-5 |
| Clarity of the NER category colours | 11 | 4.82 | 0-0-0-2-9 |
| Clarity of the semantic tagging panel | 11 | 3.82 | 0-0-5-3-3 |
| Clarity of the per-segment translation controls | 11 | 4.09 | 0-1-2-3-5 |
| Ease of moving between layers (original vs. translation) | 11 | 4.18 | 0-1-2-2-6 |
| Ease of exporting workspace as JSON | 11 | 4.91 | 0-0-0-1-10 |

Workspace creation and JSON export both averaged 4.91, with ten of eleven reviewers picking 5 in each case; the entity colour palette landed close behind at 4.82. The two weakest surfaces were segmentation editing (3.73) and the semantic tagging panel (3.82) — both with five reviewers parking at 3 rather than the 4-or-5 cluster seen elsewhere. Translation controls (4.09) and layer switching (4.18) sit in the middle but each carries three lower ratings (a 2 and two 3s), which lines up with the parallel-view complaints in Section 5.

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

The drag-to-shift interaction is the worst result in the section: four reviewers called it confusing outright, two avoided it, and only five of eleven were comfortable using it. The span-editing popup has a milder version of the same problem — three reviewers said the wrong popup sometimes appeared.

The Edited badge split the seven who engaged with it: three understood the lock-out, four did not. The badge communicates that something is locked, just not why.

The conflict-resolution dialog was rated highly by everyone who saw it, but eight reviewers never triggered it; the protocol did not force a re-NER pass over an already-annotated segment, so the dialog stayed dormant for most sessions.

## 5. Open Feedback: Convergent Themes

The open-text questions yielded substantial qualitative content. Five themes recur across multiple independent respondents.

### 5.1 Parallel-view translation editing (n=4 reviewers)

The most strongly convergent gap. Four reviewers independently asked for a parallel-view layout displaying the original segment text and its current translation side by side, on the grounds that automatic translations contain corrections that are easier to make against the source visible at the same time.

> *"As improvement could be added original text within a bubble showed over of the translated one. During corrections I made, it was required to switch between languages a bit often."* (R1)

> *"Perhaps viewing the original text and translated texts next to each other. The Dutch version had quite some mistakes, editing this is quite a nuisance if you have to keep switching back and forth between the two texts."* (R3)

> *"I think the translation editing view is not really functional in this way, as anybody who ever translated text will tell you, you need a parallel view. Clicking back and forth is extremely inefficient. I would propose to produce an option of a parallel view between selected pair of the original on the resulting translation."* (R4)

> *"Translation UI is recommended to be redone in a way that allows side-by-side comparison... swapping between languages for checking slows down the work significantly."* (R8)

### 5.2 Document-level operation visibility (n=3)

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

This contradicts another finding: several other reviewers actually praised the iconography as one of the things they liked most (Section 6).

## 6. Open Feedback: Convergent Positives

Ten of the eleven open-text answers to "what did you like most" were positive and concrete (the eleventh was a single word). Four themes recurred across them.

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

The pattern holds across the heterogeneous reviewer pool: fast, clean, and a good fit for the partial-automation workflow the consortium uses in real curation.

## 7. Identified Defects

Three interaction defects were raised during the review and have been addressed.

The first concerns the re-translation warning dialog described in Use Case UC-15. One reviewer reported that the per-segment Sync action overwrote manual edits on the translated layer without first triggering the confirmation step.

> *"I didn't get this: Try the Sync icon (re-translate). On an edited segment, it now opens a confirmation dialog warning you that re-translating will overwrite your edits... it just deleted my changes back to the poor translation."* (R5)

The defect did not reproduce on the current build under follow-up testing. The most plausible explanation is routine refactoring on the translation flow that closed the original observation path; the per-segment Sync action against an *Edited* segment now triggers the confirmation dialog described in UC-15.

The second concerns the entity edit popup snippet. After running NER on a translation layer, the popup on the original layer began to display partial translation text rather than the original surface form of the span.

> *"I might have taken the wrong steps here, but I was testing whether running the NER would also work on the translated texts. However, after using this feature, it messed up the text visible in the pop-up display for the original text (e.g. I translated it to Dutch, ran the NER again on the Dutch text, the pop up texts in the original text for the first NER 'Melbourne High' now reads a partial Dutch text 'voor Melbourne'). It is still possible to manually edit it."* (R3)

This too did not reproduce on the current build. The popover's auto-close-on-outside-click behaviour prevents the original observation path in the current code, so the cross-layer surface-form leak no longer occurs.

The third item: the thesaurus search returns no matches for queries that exactly equal an existing thesaurus entry of the same length, while shorter prefixes of the same query do return matches.

> *"The thesaurus search is struggling to give a perfect match (encountered with children's occupations); until you give it only a partial string, it finds the tag successfully, once input a 100% matching string, it gives out zero results."* (R3)

The cause was traced to a duplicate-key issue in the index data that confused React's reconciliation when fast typing changed the result list, and was resolved by de-duplicating the index at load time.

None of the three required architectural intervention.

## 8. Summary

Eleven reviewers, mean 4.27 on overall satisfaction, mean 4.45 on likelihood to use the tool for real curation work (seven picked 5), and mean 2.09 on cognitive effort (nine of eleven picked 1 or 2). Workspace creation, NER colour clarity, and JSON export came out on top. The two weakest surfaces were segmentation editing (3.73) and the semantic tagging panel (3.82); the drag-handle for boundary shifts and the placement of the auto-tag wand are the specific points the open feedback keeps coming back to.

The single most actionable finding is the parallel-view request for translation post-editing — four reviewers asked for it independently, and the lower scores on layer switching back the same complaint up. On the positive side, what reviewers liked most was the visual cleanliness of the interface, the hybrid-automation philosophy, and the speed of the tool. Two interaction defects and one thesaurus-search edge case were raised and have been addressed; none required architectural intervention.
