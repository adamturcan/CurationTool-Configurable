import React from "react";
import { Slide } from "@mui/material";
import type { TransitionProps } from "@mui/material/transitions";

/** Material UI Slide-up transition for use as a Dialog `TransitionComponent`. */
const SlideTransition = React.forwardRef(function SlideTransition(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: TransitionProps & { children: React.ReactElement<any, any> },
  ref: React.Ref<unknown>
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default SlideTransition;
