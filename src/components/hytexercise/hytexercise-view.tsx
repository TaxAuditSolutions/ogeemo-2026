
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { HeartPulse, Timer, Settings, PlayCircle, BarChart, OctagonAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExercisePlayer, EXERCISES } from './exercise-player';
import { ImagePlaceholder } from '../ui/image-placeholder';
import { useHytexercise, HYTEXERCISE_STORAGE_KEY, type StoredState } from '@/context/hytexercise-context';
import { useAuth } from '@/context/auth-context';
import { logHytexerciseAction, getHytexerciseLogs, type HytexerciseLog } from '@/services/hytexercise-service';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { Calendar as CalendarIcon, LoaderCircle, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';


const formatTime = (totalSeconds: number) => {
    if (totalSeconds < 0) totalSeconds = 0;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export function HytexerciseView() {
  const {
    isActive,
    breakFrequency,
    breakDuration,
    timeLeft,
    isBreakAlertOpen,
    setIsBreakAlertOpen,
    setIsActive,
    setBreakFrequency,
    setBreakDuration,
    handleSaveSettings,
  } = useHytexercise();
  
  const [isBreakActive, setIsBreakActive] = useState(false);
  const [logs, setLogs] = useState<HytexerciseLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();

  const loadLogs = useCallback(async () => {
      if (!user) return;
      setIsLoadingLogs(true);
      try {
          const data = await getHytexerciseLogs(user.uid, selectedDate, selectedDate);
          setLogs(data);
      } catch (err) {
          console.error("Error loading logs:", err);
      } finally {
          setIsLoadingLogs(false);
      }
  }, [user, selectedDate]);

  useEffect(() => {
      loadLogs();
  }, [loadLogs]);

  // If the user clicks "Start Break Now" from the global alert, they might be redirected here with `?startBreak=true`
  useEffect(() => {
      if (typeof window !== 'undefined' && window.location.search.includes('startBreak=true')) {
          setIsBreakActive(true);
          const url = new URL(window.location.href);
          url.searchParams.delete('startBreak');
          window.history.replaceState({}, '', url);
      }
  }, []);

  const handleStartRoutine = () => {
      setIsBreakAlertOpen(false);
      setIsBreakActive(true);
      localStorage.removeItem(HYTEXERCISE_STORAGE_KEY);
  };

  const handleFinishBreak = async () => {
      setIsBreakActive(false);
      
      if (user) {
          try {
              await logHytexerciseAction(user.uid, 'completed', breakDuration);
          } catch (e) {
              console.error("Failed to log completion", e);
          }
      }

      // Automatically restart the timer for the next break
      const dueTimestamp = Date.now() + breakFrequency * 60 * 1000;
      const stateToStore: StoredState = {
          isActive: true,
          breakDueTimestamp: dueTimestamp,
          breakFrequency,
          breakDuration,
      };
      localStorage.setItem(HYTEXERCISE_STORAGE_KEY, JSON.stringify(stateToStore));
      
      toast({
          title: "Thanks for protecting your health",
      });
      
      // Force a reload so the context picks up the new localStorage value immediately
      window.location.reload();
  };
  
  if (isBreakActive) {
      return <ExercisePlayer breakDurationMinutes={breakDuration} onFinish={handleFinishBreak} />
  }

  return (
    <>
      <div className="p-4 sm:p-6 space-y-6">
        <header className="relative flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left border-b pb-4">
          <div>
            <h1 className="text-3xl font-bold font-headline text-primary">Hytexercise Wellness Manager</h1>
            <p className="text-muted-foreground max-w-2xl mt-1">
              Combat the effects of prolonged sitting and take charge of your well-being with guided, five-minute chair exercises every hour.
            </p>
          </div>
          <Button size="lg" className="shadow-md whitespace-nowrap" onClick={handleStartRoutine}>
            <PlayCircle className="mr-2 h-5 w-5" /> Start Routine
          </Button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Status & Controls Card */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><HeartPulse className="h-5 w-5"/> Status & Controls</CardTitle>
              <CardDescription>Activate the app to start receiving break reminders.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 flex-1">
              <div className="flex items-center space-x-4 rounded-md border p-4">
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    Hytexercise Active
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isActive ? "You will receive break alerts." : "Alerts are currently disabled."}
                  </p>
                </div>
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  aria-label="Activate Hytexercise"
                />
              </div>
              <div className="flex items-center text-lg">
                <Timer className="mr-3 h-6 w-6 text-primary"/>
                <div className="flex-1">
                  <span>Next break in:</span>
                  <span className="font-bold ml-2 font-mono">
                    {isActive ? formatTime(timeLeft) : 'Paused'}
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => setIsBreakAlertOpen(true)}>
                    Test Break Alert
                </Button>
            </CardFooter>
          </Card>

          {/* Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5"/> Settings</CardTitle>
              <CardDescription>Customize your break schedule.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="frequency">Break Frequency (minutes)</Label>
                <Input id="frequency" type="number" value={breakFrequency} onChange={(e) => setBreakFrequency(Number(e.target.value))} placeholder="e.g., 60" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Break Duration (minutes)</Label>
                <Input id="duration" type="number" value={breakDuration} onChange={(e) => setBreakDuration(Number(e.target.value))} placeholder="e.g., 5" />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveSettings}>Save Settings</Button>
            </CardFooter>
          </Card>
          
          {/* Exercise List */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><PlayCircle className="h-5 w-5"/> Exercise Routine</CardTitle>
              <CardDescription>Your 6-step hytexercise chair routine.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {EXERCISES.map((ex) => (
                <div key={ex.id} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start border-b pb-8 last:border-0 last:pb-0">
                  <div className="md:col-span-1 aspect-video bg-muted rounded-lg flex items-center justify-center relative overflow-hidden shadow-sm">
                      <ImagePlaceholder id={ex.id} className="w-full h-full" />
                  </div>
                  <div className="md:col-span-2 space-y-3">
                    <h3 className="text-xl font-bold text-primary">{ex.title}</h3>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p><strong className="text-foreground">Instructions:</strong> {ex.instructions}</p>
                      <p><strong className="text-foreground">Movement:</strong> {ex.movement}</p>
                      <p><strong className="text-foreground">Duration:</strong> {ex.duration}</p>
                      <p><strong className="text-foreground">Repetitions:</strong> {ex.repetitions}</p>
                      <p className="italic bg-muted/50 p-2 rounded border-l-4 border-primary"><strong className="text-foreground">Tip:</strong> {ex.tip}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
            <CardFooter>
              <Button size="lg" className="w-full" onClick={handleStartRoutine}>Start Routine</Button>
            </CardFooter>
          </Card>
          
          {/* My Progress Card */}
          <Card className="lg:col-span-3">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2"><BarChart className="h-5 w-5"/> My Progress</CardTitle>
                <CardDescription>Track your consistency and see how you're doing over time.</CardDescription>
              </div>
              <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : <span>Filter by Date</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <CustomCalendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                            setSelectedDate(date);
                            setIsDatePickerOpen(false);
                        }}
                        initialFocus
                    />
                    <div className="p-3 border-t bg-muted/20 flex justify-end gap-2">
                         <Button variant="ghost" size="sm" onClick={() => { setSelectedDate(undefined); setIsDatePickerOpen(false); }}>Clear Filter</Button>
                    </div>
                </PopoverContent>
              </Popover>
            </CardHeader>
            <CardContent>
              {isLoadingLogs ? (
                  <div className="flex justify-center p-8"><LoaderCircle className="h-8 w-8 animate-spin text-primary" /></div>
              ) : (
                  <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="p-4 rounded-lg bg-muted/30 border text-center">
                              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Routines Completed</p>
                              <p className="text-3xl font-bold font-mono text-green-600">{logs.filter(l => l.action === 'completed').length}</p>
                          </div>
                          <div className="p-4 rounded-lg bg-muted/30 border text-center">
                              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Time Exercised</p>
                              <p className="text-3xl font-bold font-mono text-primary">
                                  {logs.filter(l => l.action === 'completed').reduce((sum, l) => sum + l.durationMinutes, 0)} <span className="text-lg">min</span>
                              </p>
                          </div>
                          <div className="p-4 rounded-lg bg-muted/30 border text-center">
                              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Completion Rate</p>
                              <p className="text-3xl font-bold font-mono text-blue-500">
                                  {logs.length > 0 ? Math.round((logs.filter(l => l.action === 'completed').length / logs.length) * 100) : 0}%
                              </p>
                          </div>
                      </div>
                      
                      {logs.length > 0 ? (
                          <div className="border rounded-lg overflow-hidden">
                              <table className="w-full text-sm text-left">
                                  <thead className="bg-muted/50 border-b">
                                      <tr>
                                          <th className="p-3 font-semibold">Date & Time</th>
                                          <th className="p-3 font-semibold">Action</th>
                                          <th className="p-3 font-semibold text-right">Duration</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y">
                                      {logs.map(log => (
                                          <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                                              <td className="p-3 whitespace-nowrap">{format(log.timestamp, 'PP p')}</td>
                                              <td className="p-3">
                                                  {log.action === 'completed' ? (
                                                      <span className="flex items-center gap-2 text-green-600 font-medium"><CheckCircle className="h-4 w-4"/> Completed</span>
                                                  ) : (
                                                      <span className="flex items-center gap-2 text-destructive font-medium"><XCircle className="h-4 w-4"/> Skipped</span>
                                                  )}
                                              </td>
                                              <td className="p-3 text-right text-muted-foreground">{log.action === 'completed' ? `${log.durationMinutes} min` : '-'}</td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      ) : (
                          <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg bg-muted/10">
                              <p>No exercise activity found for the selected period.</p>
                          </div>
                      )}
                  </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
    </>
  );
}
