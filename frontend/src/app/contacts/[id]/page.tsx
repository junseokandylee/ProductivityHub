'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Edit, Save, X, User, Phone, Mail, MessageSquare, Clock, Tag as TagIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

import { contactsAPI } from '@/lib/api/contacts';
import { Contact, ContactHistory, UpdateContactRequest } from '@/lib/types/contact';
import InlineTagEditor from '@/components/tags/InlineTagEditor';

const editContactSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  kakaoId: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean()
});

type EditContactForm = z.infer<typeof editContactSchema>;

const getHistoryIcon = (type: ContactHistory['type']) => {
  switch (type) {
    case 'created':
      return <User className="w-4 h-4 text-green-500" />;
    case 'updated':
      return <Edit className="w-4 h-4 text-blue-500" />;
    case 'imported':
      return <User className="w-4 h-4 text-purple-500" />;
    case 'merged':
      return <User className="w-4 h-4 text-orange-500" />;
    case 'tag_added':
    case 'tag_removed':
      return <TagIcon className="w-4 h-4 text-indigo-500" />;
    case 'message_sent':
      return <MessageSquare className="w-4 h-4 text-green-600" />;
    case 'deactivated':
    case 'reactivated':
      return <Clock className="w-4 h-4 text-gray-500" />;
    default:
      return <Clock className="w-4 h-4 text-gray-400" />;
  }
};

const formatHistoryDescription = (history: ContactHistory) => {
  const time = new Date(history.createdAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  return `${time} - ${history.description}`;
};

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  
  const contactId = params.id as string;

  // Fetch contact data
  const { data: contact, isLoading, error } = useQuery({
    queryKey: ['contact', contactId],
    queryFn: () => contactsAPI.getContact(contactId),
  });

  // Fetch contact history
  const { data: history = [] } = useQuery({
    queryKey: ['contact-history', contactId],
    queryFn: () => contactsAPI.getContactHistory(contactId, { limit: 100 }),
    enabled: !!contactId
  });

  // Set up form
  const form = useForm<EditContactForm>({
    resolver: zodResolver(editContactSchema),
    defaultValues: {
      fullName: contact?.fullName || '',
      phone: contact?.phone || '',
      email: contact?.email || '',
      kakaoId: contact?.kakaoId || '',
      notes: contact?.notes || '',
      isActive: contact?.isActive ?? true
    }
  });

  // Reset form when contact data changes
  React.useEffect(() => {
    if (contact) {
      form.reset({
        fullName: contact.fullName,
        phone: contact.phone || '',
        email: contact.email || '',
        kakaoId: contact.kakaoId || '',
        notes: contact.notes || '',
        isActive: contact.isActive
      });
    }
  }, [contact, form]);

  // Update contact mutation
  const updateContactMutation = useMutation({
    mutationFn: (data: UpdateContactRequest) => contactsAPI.updateContact(contactId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact', contactId] });
      queryClient.invalidateQueries({ queryKey: ['contact-history', contactId] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Contact updated successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update contact",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: EditContactForm) => {
    updateContactMutation.mutate({
      fullName: data.fullName,
      phone: data.phone || undefined,
      email: data.email || undefined,
      kakaoId: data.kakaoId || undefined,
      notes: data.notes || undefined,
      isActive: data.isActive,
    });
  };

  const handleCancel = () => {
    if (contact) {
      form.reset({
        fullName: contact.fullName,
        phone: contact.phone || '',
        email: contact.email || '',
        kakaoId: contact.kakaoId || '',
        notes: contact.notes || '',
        isActive: contact.isActive
      });
    }
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert>
            <AlertDescription>
              Failed to load contact. Please try again.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/contacts')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Contacts
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{contact.fullName}</h1>
              <p className="text-gray-600 mt-1">
                Contact Details & History
              </p>
            </div>
          </div>
          
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Contact
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={updateContactMutation.isPending}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={form.handleSubmit(onSubmit)}
                disabled={updateContactMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                {updateContactMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Form {...form}>
                    <form className="space-y-4">
                      <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter full name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter phone number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter email address" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="kakaoId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Kakao ID</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter Kakao ID" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter notes about this contact" 
                                rows={4}
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between">
                            <div>
                              <FormLabel>Active Status</FormLabel>
                              <p className="text-sm text-gray-600">
                                Inactive contacts are hidden from messaging campaigns
                              </p>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </form>
                  </Form>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span>{contact.phone || 'No phone number'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-gray-500" />
                        <span>{contact.email || 'No email address'}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-4 h-4 text-gray-500" />
                      <span>{contact.kakaoId || 'No Kakao ID'}</span>
                    </div>

                    {contact.notes && (
                      <div>
                        <h4 className="font-medium mb-2">Notes</h4>
                        <p className="text-gray-600 bg-gray-50 p-3 rounded-md">
                          {contact.notes}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <span className="font-medium">Status:</span>
                      <Badge variant={contact.isActive ? "default" : "secondary"}>
                        {contact.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Tags</h4>
                      <InlineTagEditor
                        contactId={contact.id}
                        currentTags={contact.tags}
                        onTagsChange={(newTags) => {
                          // Optimistic update
                          queryClient.setQueryData(['contact', contactId], (prev: Contact) => ({
                            ...prev,
                            tags: newTags
                          }));
                        }}
                      />
                    </div>

                    <Separator />

                    <div className="text-sm text-gray-500">
                      <p>Created: {new Date(contact.createdAt).toLocaleString('ko-KR')}</p>
                      <p>Last Updated: {new Date(contact.updatedAt).toLocaleString('ko-KR')}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* History Timeline */}
          <div className="lg:col-span-1">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Activity Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto">
                  {history.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No activity history</p>
                  ) : (
                    <div className="space-y-4">
                      {history.map((item, index) => (
                        <div key={item.id} className="flex gap-3 relative">
                          {/* Connector line */}
                          {index < history.length - 1 && (
                            <div className="absolute left-2 top-6 w-px h-8 bg-gray-200" />
                          )}
                          
                          {/* Icon */}
                          <div className="flex-shrink-0 w-4 h-4 mt-0.5">
                            {getHistoryIcon(item.type)}
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 break-words">
                              {formatHistoryDescription(item)}
                            </p>
                            {item.userName && (
                              <p className="text-xs text-gray-500 mt-1">
                                by {item.userName}
                              </p>
                            )}
                            {item.metadata && Object.keys(item.metadata).length > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
                                <details>
                                  <summary className="cursor-pointer">Details</summary>
                                  <pre className="mt-1 whitespace-pre-wrap">
                                    {JSON.stringify(item.metadata, null, 2)}
                                  </pre>
                                </details>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}