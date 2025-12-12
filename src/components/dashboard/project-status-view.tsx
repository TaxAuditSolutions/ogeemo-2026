
'use client';

import * as React from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getProjects, getTasksForUser, updateProject, deleteProject } from '@/services/project-service';
import { useAuth } from '@/context/auth-context';
import { type Project, type Event as TaskEvent, type ProjectStatus } from '@/types/calendar-types';
import { LoaderCircle, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '../ui/button';
import { ProjectManagementHeader } from '../tasks/ProjectManagementHeader';
import { useRouter } from 'next/navigation';

const ItemTypes = {
  PROJECT: 'project',
};

interface ProjectStatusCardProps {
  project: Project;
  tasks: TaskEvent[];
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

function ProjectStatusCard({ project, tasks, onEdit, onDelete }: ProjectStatusCardProps) {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: ItemTypes.PROJECT,
        item: { id: project.id, status: project.status },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }));
    
    const projectTasks = tasks.filter(t => t.projectId === project.id);
    const completedTasks = projectTasks.filter(t => t.status === 'done').length;
    const totalTasks = projectTasks.length;
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return (
        <Card ref={drag} className={cn("mb-4 cursor-move group", isDragging && "opacity-50")}>
            <CardHeader className="p-4 flex flex-row items-start justify-between">
                <Link href={`/projects/${project.id}/tasks`} className="hover:underline space-y-1">
                    <CardTitle className="text-base">{project.name}</CardTitle>
                </Link>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                             <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => onEdit(project)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onDelete(project)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Project
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <div className="flex justify-between items-center mb-1">
                    <p className="text-xs text-muted-foreground">Progress</p>
                    <p className="text-xs text-muted-foreground">{completedTasks} of {totalTasks} tasks</p>
                </div>
                <Progress value={progress} />
            </CardContent>
        </Card>
    );
}

interface ProjectColumnProps {
    status: ProjectStatus;
    projects: Project[];
    tasks: TaskEvent[];
    onDropProject: (projectId: string, newStatus: ProjectStatus) => void;
    onEditProject: (project: Project) => void;
    onDeleteProject: (project: Project) => void;
}

function ProjectColumn({ status, projects, tasks, onDropProject, onEditProject, onDeleteProject }: ProjectColumnProps) {
    const [{ canDrop, isOver }, drop] = useDrop(() => ({
        accept: ItemTypes.PROJECT,
        drop: (item: { id: string }) => onDropProject(item.id, status),
        collect: (monitor) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    }));

    const titleMap: Record<ProjectStatus, string> = {
        planning: 'In Planning',
        active: 'Active',
        'on-hold': 'On-Hold',
        completed: 'Completed',
    };
    
    const displayTitle = titleMap[status];

    return (
        <Card ref={drop} className={cn("bg-muted/30 transition-colors", isOver && canDrop && "bg-primary/10")}>
            <CardHeader>
                <CardTitle>{displayTitle}</CardTitle>
            </CardHeader>
            <CardContent className="min-h-96">
                {projects.map(p => <ProjectStatusCard key={p.id} project={p} tasks={tasks} onEdit={onEditProject} onDelete={onDeleteProject} />)}
            </CardContent>
        </Card>
    );
}


export function ProjectStatusView() {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [tasks, setTasks] = React.useState<TaskEvent[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [projectToDelete, setProjectToDelete] = React.useState<Project | null>(null);
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const loadData = React.useCallback(async () => {
    if (!user) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
        const [fetchedProjects, fetchedTasks] = await Promise.all([
            getProjects(user.uid),
            getTasksForUser(user.uid),
        ]);
        setProjects(fetchedProjects);
        setTasks(fetchedTasks);
    } catch (error) {
        console.error("Failed to load project status data:", error);
    } finally {
        setIsLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);
  
  const handleDropProject = async (projectId: string, newStatus: ProjectStatus) => {
    const projectToMove = projects.find(p => p.id === projectId);
    if (!projectToMove || projectToMove.status === newStatus) return;
    
    const originalProjects = projects;
    const updatedProjects = projects.map(p => 
        p.id === projectId ? { ...p, status: newStatus } : p
    );
    setProjects(updatedProjects);
    
    try {
        await updateProject(projectId, { status: newStatus });
        toast({
            title: "Project Status Updated",
            description: `"${projectToMove.name}" has been moved to ${newStatus}.`,
        });
    } catch (error: any) {
        setProjects(originalProjects);
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: error.message || "Could not update the project status.",
        });
    }
  };
  
  const handleEditProject = (project: Project) => {
      // Placeholder for edit dialog
      toast({ title: "Edit Clicked", description: `Editing for "${project.name}" would open here.` });
  };
  
  const handleConfirmDelete = async () => {
      if (!projectToDelete) return;
      
      const originalProjects = [...projects];
      const originalTasks = [...tasks];
      
      setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
      setTasks(prev => prev.filter(t => t.projectId !== projectToDelete.id));

      try {
          const tasksToDelete = tasks.filter(t => t.projectId === projectToDelete.id);
          await deleteProject(projectToDelete.id, tasksToDelete.map(t => t.id));
          toast({ title: "Project Deleted", description: `"${projectToDelete.name}" and its tasks have been deleted.` });
      } catch (error: any) {
          toast({ variant: "destructive", title: "Delete Failed", description: error.message });
          setProjects(originalProjects);
          setTasks(originalTasks);
      } finally {
          setProjectToDelete(null);
      }
  };

  const projectsByStatus = React.useMemo(() => {
    const planning: Project[] = [];
    const active: Project[] = [];
    const onHold: Project[] = [];
    const completed: Project[] = [];

    projects.forEach(p => {
        if (p.status === 'completed') {
            completed.push(p);
        } else if (p.status === 'on-hold') {
            onHold.push(p);
        } else if (p.status === 'planning') {
            planning.push(p);
        } else {
            active.push(p);
        }
    });
    return { planning, active, onHold, completed };
  }, [projects]);
  
  if (isLoading) {
    return (
        <div className="flex h-full w-full items-center justify-center">
            <LoaderCircle className="h-8 w-8 animate-spin" />
        </div>
    );
  }
  
  return (
    <>
        <div className="space-y-6 p-4 sm:p-6">
            <header className="text-center">
                <h1 className="text-3xl font-bold font-headline text-primary">Project Status Board</h1>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                    A Kanban-style overview of all your projects. Drag and drop to change a project's status.
                </p>
            </header>
            <ProjectManagementHeader />
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <ProjectColumn status="planning" projects={projectsByStatus.planning} tasks={tasks} onDropProject={handleDropProject} onEditProject={handleEditProject} onDeleteProject={setProjectToDelete} />
            <ProjectColumn status="active" projects={projectsByStatus.active} tasks={tasks} onDropProject={handleDropProject} onEditProject={handleEditProject} onDeleteProject={setProjectToDelete} />
            <ProjectColumn status="on-hold" projects={projectsByStatus.onHold} tasks={tasks} onDropProject={handleDropProject} onEditProject={handleEditProject} onDeleteProject={setProjectToDelete} />
            <ProjectColumn status="completed" projects={projectsByStatus.completed} tasks={tasks} onDropProject={handleDropProject} onEditProject={handleEditProject} onDeleteProject={setProjectToDelete} />
          </div>
        </div>
        <AlertDialog open={!!projectToDelete} onOpenChange={() => setProjectToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the project "{projectToDelete?.name}" and all of its associated tasks. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
