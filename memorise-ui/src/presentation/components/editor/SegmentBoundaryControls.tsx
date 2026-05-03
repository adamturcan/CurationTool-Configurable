import React from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import CallMergeIcon from "@mui/icons-material/CallMerge";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { ENTITY_COLORS } from "../../../shared/constants/notationEditor";
import { shadows } from "../../../shared/theme";

interface Props {
  segmentId: string;
  prevSegmentId?: string;
  index: number;
  onJoinUp: (segmentId: string) => void;
  onDragStart: (boundaryIndex: number) => void;
  onDragEnd: () => void;
  setHoveredIdx: (idx: number | null) => void;
}

/**
 * Floating controls above a segment's top edge for merging it with the previous segment and dragging the boundary between them.
 * Visibility is driven by parent CSS via the `boundary-btn-group` class and `data-boundary-visible="1"` attribute.
 */
const SegmentBoundaryControls: React.FC<Props> = ({
  segmentId,
  prevSegmentId,
  index,
  onJoinUp,
  onDragStart,
  onDragEnd,
  setHoveredIdx,
}) => (
  <Box
    className="boundary-btn-group"
    onMouseEnter={() => setHoveredIdx(index - 1)}
    onMouseLeave={() => setHoveredIdx(null)}
    sx={{ position: "absolute", top: "-14px", left: "50%", transform: "translateX(-50%)", zIndex: 10 }}
  >
    <Tooltip title="Merge segments">
      <IconButton
        className="join-btn"
        onClick={(e) => { e.stopPropagation(); onJoinUp(segmentId); }}
        sx={{
          transition: "transform 0.2s ease",
          bgcolor: "background.paper",
          border: `1px solid ${ENTITY_COLORS.DATE}`,
          boxShadow: shadows.sm,
          width: 28, height: 28,
          "&:hover": { bgcolor: "#f0f7ff", transform: "scale(1.1)" },
        }}
      >
        <CallMergeIcon sx={{ transform: "rotate(180deg)", fontSize: "1.1rem", color: ENTITY_COLORS.DATE }} />
      </IconButton>
    </Tooltip>
    <Tooltip title="Drag to shift boundary">
      <IconButton
        className="drag-btn"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("application/segment-id", prevSegmentId || segmentId);
          e.dataTransfer.effectAllowed = "move";
          if (index > 0) onDragStart(index - 1);
        }}
        onDragEnd={() => onDragEnd()}
        sx={{
          cursor: "grab",
          transition: "transform 0.2s ease",
          bgcolor: "background.paper",
          border: `1px solid ${ENTITY_COLORS.DATE}`,
          boxShadow: shadows.sm,
          width: 28, height: 28,
          ml: 1,
          "&:hover": { bgcolor: "#f0f7ff", transform: "scale(1.1)" },
          "&:active": { cursor: "grabbing" },
        }}
      >
        <DragIndicatorIcon sx={{ fontSize: "1.1rem", color: ENTITY_COLORS.DATE }} />
      </IconButton>
    </Tooltip>
  </Box>
);

export default SegmentBoundaryControls;
