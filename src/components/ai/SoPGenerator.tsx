import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  FileText,
  Brain,
  Edit3,
  Download,
  Copy,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Target,
  BookOpen,
  GraduationCap,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getSupabaseBrowserConfig } from "@/lib/supabaseClientConfig";

interface LoadedStatement {
  content: string;
  fileName?: string;
}

interface SoPGeneratorProps {
  programName?: string;
  universityName?: string;
  onSave?: (sop: string) => Promise<void> | void;
  loadedStatement?: LoadedStatement | null;
  onLoadedStatementApplied?: () => void;
}

export default function SoPGenerator({
  programName,
  universityName,
  onSave,
  loadedStatement,
  onLoadedStatementApplied,
}: SoPGeneratorProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [generatedSOP, setGeneratedSOP] = useState("");
  const [editedSOP, setEditedSOP] = useState("");
  const [activeTab, setActiveTab] = useState("generate");
  const [currentDocumentName, setCurrentDocumentName] = useState<string | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [enhancing, setEnhancing] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    academicBackground: "",
    workExperience: "",
    careerGoals: "",
    motivation: "",
    relevantSkills: "",
    achievements: "",
    programInterest: programName || "",
    universityInterest: universityName || "",
    wordCount: 500,
    tone: "professional",
  });

  const [sopMetrics, setSopMetrics] = useState({
    wordCount: 0,
    readability: 0,
    completeness: 0,
    suggestions: [] as string[],
  });

  const generateSOP = async () => {
    setLoading(true);

    try {
      const {
        url: supabaseUrl,
        functionsUrl,
        anonKey,
      } = getSupabaseBrowserConfig();
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token || anonKey;
      const functionsBase = (
        functionsUrl ?? `${supabaseUrl}/functions/v1`
      ).replace(/\/+$/, "");
      const url = `${functionsBase}/sop-generator`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          background: formData.academicBackground,
          motivation: formData.motivation,
          program: formData.programInterest,
          university: formData.universityInterest,
          goals: formData.careerGoals,
          workExperience: formData.workExperience,
          relevantSkills: formData.relevantSkills,
          achievements: formData.achievements,
          tone: formData.tone,
          targetWordCount: formData.wordCount,
        }),
      });

      if (!res.ok) throw new Error("Generation failed");
      const responseData = await res.json();
      const generatedText: string = responseData.sop || "";

      setGeneratedSOP(generatedText);
      setEditedSOP(generatedText);
      setActiveTab("edit");
      setCurrentDocumentName(null);
      analyzeSOP(generatedText);

      toast({
        title: "Success",
        description: "Statement of Purpose generated successfully!",
      });
    } catch (error) {
      console.error("Error generating SOP:", error);
      toast({
        title: "Error",
        description: "Failed to generate Statement of Purpose",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const analyzeSOP = useCallback((text: string) => {
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const avgWordsPerSentence =
      sentences.length === 0 ? wordCount : wordCount / sentences.length;

    // Simple readability score (0-100)
    const readability = Math.max(0, 100 - avgWordsPerSentence * 1.5);

    // Completeness score based on key elements
    const keyElements = [
      "academic background",
      "career goals",
      "motivation",
      "program interest",
      "university interest",
      "achievements",
      "skills",
    ];
    const foundElements = keyElements.filter((element) =>
      text.toLowerCase().includes(element.toLowerCase()),
    );
    const completeness = (foundElements.length / keyElements.length) * 100;

    const suggestions: string[] = [];
    if (wordCount < 400)
      suggestions.push(
        "Consider adding more detail to strengthen your application",
      );
    if (wordCount > 800)
      suggestions.push(
        "Consider condensing some sections to stay within recommended length",
      );
    if (readability < 60)
      suggestions.push("Try using shorter sentences to improve readability");
    if (completeness < 80)
      suggestions.push(
        "Include more specific details about your background and goals",
      );

    setSopMetrics({
      wordCount,
      readability: Math.round(readability),
      completeness: Math.round(completeness),
      suggestions,
    });
  }, []);

  const handleEdit = (value: string) => {
    setEditedSOP(value);
    analyzeSOP(value);
  };

  const enhanceSOP = () => {
    if (!editedSOP.trim()) {
      toast({
        title: "Add content",
        description: "Write or generate a statement before enhancing it",
        variant: "destructive",
      });
      return;
    }

    setEnhancing(true);

    setTimeout(() => {
      const paragraphs = editedSOP
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);

      const enrichedParagraphs = paragraphs.map((paragraph, index) => {
        let enhanced = paragraph;

        if (!/impact|contribut/i.test(paragraph)) {
          enhanced +=
            " This experience sharpened my ability to translate insights into measurable impact for the communities I serve.";
        }

        if (
          index === 0 &&
          !paragraph.toLowerCase().includes("motivat") &&
          formData.motivation
        ) {
          enhanced += ` It stems from ${formData.motivation.trim()}.`;
        }

        if (
          index === paragraphs.length - 1 &&
          (formData.programInterest || formData.universityInterest)
        ) {
          const programLabel = formData.programInterest || "this course";
          const universityLabel =
            formData.universityInterest || "your university";
          enhanced += ` I am ready to contribute meaningfully to ${programLabel} at ${universityLabel} and leverage its resources to advance my career goals.`;
        }

        return enhanced;
      });

      if (enrichedParagraphs.length === 0) {
        enrichedParagraphs.push(editedSOP.trim());
      }

      const enhancedText = enrichedParagraphs.join("\n\n");

      setEditedSOP(enhancedText);
      analyzeSOP(enhancedText);

      toast({
        title: "Stronger narrative created",
        description:
          "We reinforced your motivation, impact, and institutional fit.",
      });

      setEnhancing(false);
    }, 500);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(editedSOP);
    toast({
      title: "Copied",
      description: "Statement of Purpose copied to clipboard",
    });
  };

  const downloadSOP = () => {
    const blob = new Blob([editedSOP], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = currentDocumentName
      ? currentDocumentName
      : "statement-of-purpose.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const saveSOP = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(editedSOP);
      toast({
        title: "Saved",
        description: "Statement of Purpose saved successfully",
      });
    } catch (error) {
      console.error("Error saving SOP:", error);
      toast({
        title: "Error",
        description: "Failed to save Statement of Purpose",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!loadedStatement) return;

    setGeneratedSOP(loadedStatement.content);
    setEditedSOP(loadedStatement.content);
    setActiveTab("edit");
    setCurrentDocumentName(loadedStatement.fileName || "Saved Statement");
    analyzeSOP(loadedStatement.content);
    toast({
      title: "Loaded",
      description: loadedStatement.fileName
        ? `Loaded "${loadedStatement.fileName}" for editing`
        : "Loaded saved statement for editing",
    });
    onLoadedStatementApplied?.();
  }, [loadedStatement, analyzeSOP, onLoadedStatementApplied, toast]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Statement of Purpose Generator
          </h2>
          <p className="text-muted-foreground">
            AI-powered tool to help you craft a compelling statement of purpose
          </p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generate">Generate</TabsTrigger>
          <TabsTrigger value="edit" disabled={!generatedSOP}>
            Edit & Refine
          </TabsTrigger>
          <TabsTrigger value="analyze" disabled={!generatedSOP}>
            Analyze
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tell Us About Yourself</CardTitle>
              <CardDescription>
                Provide details about your background, goals, and motivation to
                generate a personalized statement of purpose
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="academicBackground">
                      Academic Background
                    </Label>
                    <Textarea
                      id="academicBackground"
                      placeholder="Describe your educational background, relevant coursework, and academic achievements..."
                      value={formData.academicBackground}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          academicBackground: e.target.value,
                        }))
                      }
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="workExperience">Work Experience</Label>
                    <Textarea
                      id="workExperience"
                      placeholder="Describe your professional experience, internships, or relevant projects..."
                      value={formData.workExperience}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          workExperience: e.target.value,
                        }))
                      }
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="careerGoals">Career Goals</Label>
                    <Textarea
                      id="careerGoals"
                      placeholder="What are your short-term and long-term career objectives?"
                      value={formData.careerGoals}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          careerGoals: e.target.value,
                        }))
                      }
                      rows={3}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="motivation">Motivation</Label>
                    <Textarea
                      id="motivation"
                      placeholder="Why are you interested in this field? What drives your passion?"
                      value={formData.motivation}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          motivation: e.target.value,
                        }))
                      }
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="relevantSkills">Relevant Skills</Label>
                    <Textarea
                      id="relevantSkills"
                      placeholder="List your technical skills, soft skills, and competencies..."
                      value={formData.relevantSkills}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          relevantSkills: e.target.value,
                        }))
                      }
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="achievements">Key Achievements</Label>
                    <Textarea
                      id="achievements"
                      placeholder="Highlight your notable accomplishments, awards, or recognitions..."
                      value={formData.achievements}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          achievements: e.target.value,
                        }))
                      }
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="programInterest">Course of Interest</Label>
                  <Input
                    id="programInterest"
                    value={formData.programInterest}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        programInterest: e.target.value,
                      }))
                    }
                    placeholder="e.g., Master of Computer Science"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="universityInterest">
                    University of Interest
                  </Label>
                  <Input
                    id="universityInterest"
                    value={formData.universityInterest}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        universityInterest: e.target.value,
                      }))
                    }
                    placeholder="e.g., University of Toronto"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tone">Writing Tone</Label>
                  <Select
                    value={formData.tone}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, tone: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="academic">Academic</SelectItem>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Label>Target Word Count: {formData.wordCount}</Label>
                  <input
                    type="range"
                    min="300"
                    max="1000"
                    value={formData.wordCount}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        wordCount: parseInt(e.target.value),
                      }))
                    }
                    className="w-full"
                  />
                </div>
                <Button
                  onClick={generateSOP}
                  disabled={loading}
                  className="ml-4"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Generate SOP
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="edit" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Edit Your Statement of Purpose</CardTitle>
                  <CardDescription>
                    Review and refine the generated content to make it perfect
                  </CardDescription>
                  {currentDocumentName && (
                    <div className="mt-2">
                      <Badge variant="outline">
                        Editing: {currentDocumentName}
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={copyToClipboard}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                  <Button variant="outline" onClick={downloadSOP}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={enhanceSOP}
                    disabled={enhancing || !editedSOP.trim()}
                  >
                    {enhancing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    {enhancing ? "Enhancing..." : "Make this stronger"}
                  </Button>
                  <Button onClick={saveSOP} disabled={saving}>
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    {saving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={editedSOP}
                onChange={(e) => handleEdit(e.target.value)}
                rows={20}
                className="font-mono text-sm"
                placeholder="Your statement of purpose will appear here..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analyze" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Word Count
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  {sopMetrics.wordCount}
                </div>
                <p className="text-sm text-muted-foreground">words</p>
                <div className="mt-2">
                  <Progress
                    value={Math.min((sopMetrics.wordCount / 500) * 100, 100)}
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Target: 500 words
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Readability
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  {sopMetrics.readability}%
                </div>
                <p className="text-sm text-muted-foreground">
                  readability score
                </p>
                <div className="mt-2">
                  <Progress value={sopMetrics.readability} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    Higher is better
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Completeness
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  {sopMetrics.completeness}%
                </div>
                <p className="text-sm text-muted-foreground">
                  completeness score
                </p>
                <div className="mt-2">
                  <Progress value={sopMetrics.completeness} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    Key elements covered
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {sopMetrics.suggestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Suggestions for Improvement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {sopMetrics.suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg"
                    >
                      <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2 flex-shrink-0" />
                      <p className="text-sm">{suggestion}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
