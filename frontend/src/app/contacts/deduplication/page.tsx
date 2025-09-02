'use client';

import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { deduplicationAPI } from '@/lib/api/deduplication';
import { 
  DuplicateCluster, 
  DuplicateContact, 
  DeduplicationPreviewRequest,
  MergeContactsRequest,
  MergeRules 
} from '@/lib/types/deduplication';
import { AlertCircle, Users, Merge, Eye, Settings, CheckCircle2, X } from 'lucide-react';

export default function DeduplicationPage() {
  const queryClient = useQueryClient();
  
  // Preview settings state
  const [previewSettings, setPreviewSettings] = useState<DeduplicationPreviewRequest>({
    minConfidenceScore: 0.5,
    maxClusters: 100,
    onlyWithConflicts: false,
    contactIds: []
  });
  
  // Selected clusters for merge
  const [selectedClusters, setSelectedClusters] = useState<Set<string>>(new Set());
  
  // Merge rules state
  const [mergeRules, setMergeRules] = useState<MergeRules>({
    strategy: 'MostComplete',
    preferVerified: true,
    preferRecent: true,
    fieldRules: {},
    preserveAllTags: true,
    combineNotes: true
  });
  
  // Manual survivor selections
  const [manualSurvivors, setManualSurvivors] = useState<Record<string, string>>({});
  
  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Query for duplicate preview
  const { 
    data: previewData, 
    isLoading: isLoadingPreview, 
    error: previewError, 
    refetch: refetchPreview 
  } = useQuery({
    queryKey: ['duplicates-preview', previewSettings],
    queryFn: () => deduplicationAPI.previewDuplicates(previewSettings),
    enabled: false, // Manual trigger
  });

  // Mutation for merging contacts
  const mergeMutation = useMutation({
    mutationFn: (request: MergeContactsRequest) => deduplicationAPI.mergeContacts(request),
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
        setSelectedClusters(new Set());
        refetchPreview();
      }
    },
  });

  const handlePreview = useCallback(() => {
    refetchPreview();
    setShowPreview(true);
  }, [refetchPreview]);

  const handleSelectCluster = useCallback((clusterId: string, checked: boolean) => {
    setSelectedClusters(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(clusterId);
      } else {
        newSet.delete(clusterId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAllClusters = useCallback((checked: boolean) => {
    if (checked && previewData) {
      setSelectedClusters(new Set(previewData.clusters.map(c => c.clusterId)));
    } else {
      setSelectedClusters(new Set());
    }
  }, [previewData]);

  const handleMerge = useCallback((dryRun: boolean = false) => {
    if (selectedClusters.size === 0) return;
    
    const request: MergeContactsRequest = {
      clusterIds: Array.from(selectedClusters),
      mergeRules,
      dryRun,
      manualSurvivors
    };
    
    mergeMutation.mutate(request);
  }, [selectedClusters, mergeRules, manualSurvivors, mergeMutation]);

  const handleSetManualSurvivor = useCallback((clusterId: string, contactId: string) => {
    setManualSurvivors(prev => ({
      ...prev,
      [clusterId]: contactId
    }));
  }, []);

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-100 text-green-800';
    if (score >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const formatContactInfo = (contact: DuplicateContact) => {
    const info = [];
    if (contact.phone) info.push(contact.phone);
    if (contact.email) info.push(contact.email);
    if (contact.kakaoId) info.push(`Kakao: ${contact.kakaoId}`);
    return info.join(' • ') || 'No contact info';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Contact Deduplication</h1>
          <p className="text-muted-foreground mt-2">
            Find and merge duplicate contacts to keep your contact list clean
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowSettings(!showSettings)}
          className="gap-2"
        >
          <Settings className="w-4 h-4" />
          Settings
        </Button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Detection Settings</CardTitle>
            <CardDescription>
              Configure how duplicates are detected and displayed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="confidence">Minimum Confidence Score</Label>
                <Input
                  id="confidence"
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={previewSettings.minConfidenceScore}
                  onChange={(e) => setPreviewSettings(prev => ({
                    ...prev,
                    minConfidenceScore: parseFloat(e.target.value) || 0.5
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxClusters">Maximum Clusters</Label>
                <Input
                  id="maxClusters"
                  type="number"
                  min="1"
                  max="1000"
                  value={previewSettings.maxClusters}
                  onChange={(e) => setPreviewSettings(prev => ({
                    ...prev,
                    maxClusters: parseInt(e.target.value) || 100
                  }))}
                />
              </div>
              <div className="flex items-center space-x-2 mt-6">
                <Checkbox
                  id="conflicts"
                  checked={previewSettings.onlyWithConflicts}
                  onCheckedChange={(checked) => setPreviewSettings(prev => ({
                    ...prev,
                    onlyWithConflicts: checked === true
                  }))}
                />
                <Label htmlFor="conflicts">Only show conflicts</Label>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <Label className="text-base font-medium">Merge Strategy</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <Select 
                  value={mergeRules.strategy} 
                  onValueChange={(value) => setMergeRules(prev => ({
                    ...prev,
                    strategy: value as MergeRules['strategy']
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MostComplete">Keep most complete</SelectItem>
                    <SelectItem value="MostRecent">Keep most recent</SelectItem>
                    <SelectItem value="Oldest">Keep oldest</SelectItem>
                    <SelectItem value="Manual">Manual selection</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="preferVerified"
                      checked={mergeRules.preferVerified}
                      onCheckedChange={(checked) => setMergeRules(prev => ({
                        ...prev,
                        preferVerified: checked === true
                      }))}
                    />
                    <Label htmlFor="preferVerified" className="text-sm">Prefer verified</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="preserveTags"
                      checked={mergeRules.preserveAllTags}
                      onCheckedChange={(checked) => setMergeRules(prev => ({
                        ...prev,
                        preserveAllTags: checked === true
                      }))}
                    />
                    <Label htmlFor="preserveTags" className="text-sm">Preserve all tags</Label>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Button 
          onClick={handlePreview} 
          disabled={isLoadingPreview}
          className="gap-2"
        >
          <Eye className="w-4 h-4" />
          {isLoadingPreview ? 'Finding Duplicates...' : 'Find Duplicates'}
        </Button>
        
        {showPreview && previewData && selectedClusters.size > 0 && (
          <>
            <Button 
              variant="outline"
              onClick={() => handleMerge(true)}
              disabled={mergeMutation.isPending}
              className="gap-2"
            >
              <Eye className="w-4 h-4" />
              Preview Merge
            </Button>
            <Button 
              onClick={() => handleMerge(false)}
              disabled={mergeMutation.isPending}
              className="gap-2"
            >
              <Merge className="w-4 h-4" />
              {mergeMutation.isPending ? 'Merging...' : 'Merge Selected'}
            </Button>
          </>
        )}
      </div>

      {/* Preview Results */}
      {showPreview && previewData && (
        <>
          {/* Statistics */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{previewData.totalClusters}</div>
                  <div className="text-sm text-muted-foreground">Duplicate Groups</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{previewData.totalContacts}</div>
                  <div className="text-sm text-muted-foreground">Contacts Affected</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{previewData.clustersWithConflicts}</div>
                  <div className="text-sm text-muted-foreground">Conflicts</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{previewData.estimatedSpaceSavings}</div>
                  <div className="text-sm text-muted-foreground">Space Savings</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Select All Checkbox */}
          {previewData.clusters.length > 0 && (
            <div className="flex items-center space-x-2 mb-4">
              <Checkbox
                id="selectAll"
                checked={selectedClusters.size === previewData.clusters.length}
                onCheckedChange={handleSelectAllClusters}
              />
              <Label htmlFor="selectAll" className="text-sm font-medium">
                Select All ({previewData.clusters.length} clusters)
              </Label>
              {selectedClusters.size > 0 && (
                <Badge variant="secondary">
                  {selectedClusters.size} selected
                </Badge>
              )}
            </div>
          )}

          {/* Duplicate Clusters */}
          <div className="space-y-4">
            {previewData.clusters.map((cluster) => (
              <Card key={cluster.clusterId} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        checked={selectedClusters.has(cluster.clusterId)}
                        onCheckedChange={(checked) => 
                          handleSelectCluster(cluster.clusterId, checked === true)
                        }
                      />
                      <div>
                        <CardTitle className="text-lg">
                          Duplicate Group
                        </CardTitle>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className={getConfidenceColor(cluster.confidenceScore)}>
                            {Math.round(cluster.confidenceScore * 100)}% confidence
                          </Badge>
                          <Badge variant="outline" className="gap-1">
                            <Users className="w-3 h-3" />
                            {cluster.contacts.length} contacts
                          </Badge>
                          {cluster.conflictCount > 0 && (
                            <Badge variant="destructive" className="gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {cluster.conflictCount} conflicts
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Matches: {cluster.matchingCriteria.join(', ')}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    {cluster.contacts.map((contact, index) => (
                      <div 
                        key={contact.contactId}
                        className={`p-3 rounded-lg border ${
                          contact.contactId === cluster.suggestedSurvivor.contactId
                            ? 'border-green-200 bg-green-50'
                            : 'border-gray-200'
                        } ${
                          manualSurvivors[cluster.clusterId] === contact.contactId
                            ? 'ring-2 ring-blue-500'
                            : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-medium">{contact.fullName}</span>
                              {contact.contactId === cluster.suggestedSurvivor.contactId && (
                                <Badge variant="outline" className="gap-1 text-green-700">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Suggested
                                </Badge>
                              )}
                              {manualSurvivors[cluster.clusterId] === contact.contactId && (
                                <Badge className="gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Selected
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatContactInfo(contact)}
                            </div>
                            <div className="flex items-center space-x-4 mt-1 text-xs text-muted-foreground">
                              <span>Completeness: {Math.round(contact.completenessScore * 100)}%</span>
                              <span>Fields: {contact.fieldCount}</span>
                              <span>Updated: {new Date(contact.updatedAt).toLocaleDateString()}</span>
                            </div>
                            {contact.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {contact.tags.map((tag) => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {mergeRules.strategy === 'Manual' && (
                              <Button
                                size="sm"
                                variant={manualSurvivors[cluster.clusterId] === contact.contactId ? "default" : "outline"}
                                onClick={() => handleSetManualSurvivor(cluster.clusterId, contact.contactId)}
                              >
                                {manualSurvivors[cluster.clusterId] === contact.contactId ? 'Selected' : 'Select'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Error Display */}
      {previewError && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error loading duplicate contacts: {previewError.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Merge Results */}
      {mergeMutation.data && (
        <Alert className={mergeMutation.data.success ? "border-green-200" : "border-red-200"}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {mergeMutation.data.success ? (
              <>
                Successfully processed {mergeMutation.data.clustersProcessed} clusters, 
                merged {mergeMutation.data.contactsMerged} contacts into {mergeMutation.data.survivorContacts} survivors.
              </>
            ) : (
              <>
                Merge failed with errors: {mergeMutation.data.errors.join(', ')}
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* No Results */}
      {showPreview && previewData && previewData.clusters.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Duplicates Found</h3>
            <p className="text-muted-foreground">
              Your contacts appear to be clean! No duplicates were found with the current settings.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}