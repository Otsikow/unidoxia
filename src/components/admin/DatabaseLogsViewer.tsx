import { formatUkTime } from '@/lib/dateFormat';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { dbLogger } from '@/lib/databaseLogger';
import { Download, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export const DatabaseLogsViewer = () => {
  const [logs, setLogs] = useState(dbLogger.getLogs());
  const [stats, setStats] = useState(dbLogger.getStats());
  const [filter, setFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');

  const refreshLogs = () => {
    const filteredLogs = filter === 'all' 
      ? dbLogger.getLogs() 
      : dbLogger.getLogs({ level: filter });
    setLogs(filteredLogs);
    setStats(dbLogger.getStats());
  };

  useEffect(() => {
    refreshLogs();
    const interval = setInterval(refreshLogs, 2000);
    return () => clearInterval(interval);
  }, [filter]);

  const handleExport = () => {
    const data = dbLogger.exportLogs();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `database-logs-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Logs exported successfully');
  };

  const handleClear = () => {
    dbLogger.clearLogs();
    refreshLogs();
    toast.success('Logs cleared');
  };

  const getLevelBadge = (level: string) => {
    const variants = {
      error: 'destructive',
      warn: 'default',
      info: 'secondary',
      debug: 'outline',
    } as const;

    return (
      <Badge variant={variants[level as keyof typeof variants] || 'outline'}>
        {level.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Database Logs</CardTitle>
              <CardDescription>
                Real-time monitoring of database operations and errors
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={refreshLogs}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={handleClear}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Total Operations</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-destructive">{stats.errors}</div>
                <p className="text-xs text-muted-foreground">Errors</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.avgDuration}ms</div>
                <p className="text-xs text-muted-foreground">Avg Duration</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {Object.keys(stats.byOperation).length}
                </div>
                <p className="text-xs text-muted-foreground">Operation Types</p>
              </CardContent>
            </Card>
          </div>

          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
              <TabsTrigger value="error">Errors ({stats.errors})</TabsTrigger>
              <TabsTrigger value="warn">
                Warnings ({stats.byLevel.warn || 0})
              </TabsTrigger>
              <TabsTrigger value="info">Info ({stats.byLevel.info || 0})</TabsTrigger>
            </TabsList>

            <TabsContent value={filter} className="mt-4">
              <ScrollArea className="h-[500px] rounded-md border p-4">
                {logs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No logs to display
                  </div>
                ) : (
                  <div className="space-y-2">
                    {logs.map((log, index) => (
                      <div
                        key={index}
                        className="p-3 rounded-lg border bg-card text-card-foreground hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            {getLevelBadge(log.level)}
                            <Badge variant="outline">{log.operation}</Badge>
                            {log.table && (
                              <span className="text-sm font-mono">{log.table}</span>
                            )}
                            {log.function && (
                              <span className="text-sm font-mono">{log.function}()</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {log.duration && <span>{log.duration}ms</span>}
                            <span>{formatUkTime(log.timestamp)}</span>
                          </div>
                        </div>
                        
                        {log.context && (
                          <div className="text-sm mb-2">{log.context}</div>
                        )}
                        
                        {log.error && (
                          <div className="text-sm text-destructive font-mono bg-destructive/10 p-2 rounded">
                            {log.error.message}
                          </div>
                        )}
                        
                        {log.params && Object.keys(log.params).length > 0 && (
                          <details className="mt-2">
                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                              View Parameters
                            </summary>
                            <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-x-auto">
                              {JSON.stringify(log.params, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
