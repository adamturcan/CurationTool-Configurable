/** Reports Core Web Vitals (LCP, INP, CLS, FCP, TTFB) to the console. */
import { onCLS, onINP, onFCP, onLCP, onTTFB } from "web-vitals";
export function reportWebVitals() {
  const logMetric = (metric: { name: string; value: number; id: string; rating: string }) => {
    const { name, value, id, rating } = metric;
    const emoji = rating === "good" ? "✅" : rating === "needs-improvement" ? "⚠️" : "❌";
    
    console.log(
      `[Web Vitals] ${emoji} ${name}: ${Math.round(value)}ms (${rating}) [${id}]`
    );
    
    // Future: Send to analytics endpoint
    // if (import.meta.env.PROD) {
    //   fetch('/api/analytics/vitals', {
    //     method: 'POST',
    //     body: JSON.stringify(metric),
    //   });
    // }
  };

  // Largest Contentful Paint - measures loading performance
  onLCP(logMetric);

  // Interaction to Next Paint - measures interactivity (replaces FID)
  onINP(logMetric);

  // Cumulative Layout Shift - measures visual stability
  onCLS(logMetric);

  // First Contentful Paint - measures initial rendering
  onFCP(logMetric);

  // Time to First Byte - measures server response time
  onTTFB(logMetric);
}

