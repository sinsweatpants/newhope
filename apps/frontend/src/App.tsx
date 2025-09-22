import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ScreenplayProcessorPage from "@/features/screenplay/pages/screenplay-processor";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";
import { requestForToken, onMessageListener } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

function Router() {
  return (
    <Switch>
      <Route path="/" component={ScreenplayProcessorPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const { toast } = useToast();

  useEffect(() => {
    requestForToken();

    onMessageListener()
      .then((payload) => {
        toast({
          title: payload.notification.title,
          description: payload.notification.body,
        });
        console.log(payload);
      })
      .catch((err) => console.log("failed: ", err));
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
