'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'
import { 
  ArrowLeft,
  UserPlus,
  Users,
  MoreVertical,
  Mail,
  Crown,
  Shield,
  User,
  AlertCircle,
  RefreshCw,
  Calendar,
  Clock,
  Ban,
  Trash2,
  Edit
} from 'lucide-react'
import { 
  useUsers, 
  useInviteUser, 
  useUpdateUser, 
  useDeleteUser,
  type User 
} from '@/lib/api/settings'

const inviteUserSchema = z.object({
  email: z.string().email('올바른 이메일 주소를 입력하세요'),
  name: z.string().min(1, '이름은 필수입니다').max(50, '이름은 50자를 초과할 수 없습니다'),
  role: z.enum(['Admin', 'Staff'], { required_error: '역할을 선택하세요' }),
  message: z.string().max(500, '메시지는 500자를 초과할 수 없습니다').optional()
})

type InviteUserForm = z.infer<typeof inviteUserSchema>

const updateUserSchema = z.object({
  name: z.string().min(1, '이름은 필수입니다').max(50, '이름은 50자를 초과할 수 없습니다'),
  role: z.enum(['Admin', 'Staff'], { required_error: '역할을 선택하세요' }),
  status: z.enum(['active', 'suspended'], { required_error: '상태를 선택하세요' })
})

type UpdateUserForm = z.infer<typeof updateUserSchema>

const roleIcons = {
  Owner: <Crown className="h-4 w-4 text-yellow-600" />,
  Admin: <Shield className="h-4 w-4 text-blue-600" />,
  Staff: <User className="h-4 w-4 text-gray-600" />
}

const roleColors = {
  Owner: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  Admin: 'bg-blue-100 text-blue-700 border-blue-300',
  Staff: 'bg-gray-100 text-gray-700 border-gray-300'
}

const statusColors = {
  active: 'bg-green-100 text-green-700 border-green-300',
  invited: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  suspended: 'bg-red-100 text-red-700 border-red-300'
}

const statusText = {
  active: '활성',
  invited: '초대됨',
  suspended: '정지됨'
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function UserCard({ 
  user, 
  currentUser,
  onUpdate, 
  onDelete 
}: { 
  user: User
  currentUser?: User
  onUpdate: (userId: string, data: UpdateUserForm) => void
  onDelete: (userId: string) => void
}) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  
  const updateForm = useForm<UpdateUserForm>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      name: user.name,
      role: user.role === 'Owner' ? 'Admin' : user.role, // Can't change Owner role
      status: user.status === 'invited' ? 'active' : user.status as any
    }
  })

  const handleUpdate = (data: UpdateUserForm) => {
    onUpdate(user.id, data)
    setIsEditDialogOpen(false)
  }

  const handleDelete = () => {
    onDelete(user.id)
    setIsDeleteConfirmOpen(false)
  }

  const canEdit = currentUser?.role === 'Owner' || 
    (currentUser?.role === 'Admin' && user.role !== 'Owner' && user.id !== currentUser.id)
  const canDelete = currentUser?.role === 'Owner' && user.role !== 'Owner' && user.id !== currentUser.id

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar>
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{user.name}</h3>
                {user.id === currentUser?.id && (
                  <Badge variant="outline" className="text-xs">나</Badge>
                )}
              </div>
              <p className="text-sm text-gray-600">{user.email}</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={roleColors[user.role]}>
                  <div className="flex items-center gap-1">
                    {roleIcons[user.role]}
                    {user.role === 'Owner' ? '소유자' : user.role === 'Admin' ? '관리자' : '직원'}
                  </div>
                </Badge>
                <Badge variant="outline" className={statusColors[user.status]}>
                  {statusText[user.status]}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right text-sm text-gray-600">
              {user.lastLogin ? (
                <>
                  <p>마지막 로그인</p>
                  <p className="font-medium">
                    {new Date(user.lastLogin).toLocaleDateString()}
                  </p>
                </>
              ) : user.status === 'invited' ? (
                <>
                  <p>초대일</p>
                  <p className="font-medium">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </>
              ) : (
                <p>로그인 기록 없음</p>
              )}
            </div>

            {(canEdit || canDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canEdit && (
                    <DropdownMenuItem onSelect={() => setIsEditDialogOpen(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      편집
                    </DropdownMenuItem>
                  )}
                  {canEdit && user.status === 'active' && (
                    <DropdownMenuItem 
                      onSelect={() => onUpdate(user.id, { 
                        ...updateForm.getValues(), 
                        status: 'suspended' 
                      })}
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      사용자 정지
                    </DropdownMenuItem>
                  )}
                  {canEdit && user.status === 'suspended' && (
                    <DropdownMenuItem 
                      onSelect={() => onUpdate(user.id, { 
                        ...updateForm.getValues(), 
                        status: 'active' 
                      })}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      정지 해제
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onSelect={() => setIsDeleteConfirmOpen(true)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        사용자 삭제
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* User Permissions */}
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm text-gray-600 mb-2">권한</p>
          <div className="flex flex-wrap gap-1">
            {user.permissions.map((permission, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {permission}
              </Badge>
            ))}
          </div>
        </div>

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>사용자 편집</DialogTitle>
              <DialogDescription>
                사용자의 정보와 역할을 수정합니다
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={updateForm.handleSubmit(handleUpdate)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">이름</Label>
                <Input
                  id="edit-name"
                  {...updateForm.register('name')}
                />
                {updateForm.formState.errors.name && (
                  <p className="text-sm text-red-600">
                    {updateForm.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>역할</Label>
                <Select
                  value={updateForm.watch('role')}
                  onValueChange={(value) => updateForm.setValue('role', value as any)}
                  disabled={user.role === 'Owner'}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">관리자</SelectItem>
                    <SelectItem value="Staff">직원</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>상태</Label>
                <Select
                  value={updateForm.watch('status')}
                  onValueChange={(value) => updateForm.setValue('status', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">활성</SelectItem>
                    <SelectItem value="suspended">정지됨</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  취소
                </Button>
                <Button type="submit">저장</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>사용자 삭제</DialogTitle>
              <DialogDescription>
                정말로 {user.name} 사용자를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsDeleteConfirmOpen(false)}
              >
                취소
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
              >
                삭제
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

export default function UsersSettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  
  const { 
    data: users, 
    isLoading, 
    error,
    refetch 
  } = useUsers()
  
  const inviteUser = useInviteUser()
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()

  // Mock current user - in real app this would come from auth context
  const currentUser = users?.find(u => u.email === 'admin@example.com') || users?.[0]

  const inviteForm = useForm<InviteUserForm>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      email: '',
      name: '',
      role: 'Staff',
      message: ''
    }
  })

  const handleInviteUser = async (data: InviteUserForm) => {
    try {
      await inviteUser.mutateAsync(data)
      toast({
        title: "사용자 초대 완료",
        description: `${data.email}로 초대 이메일을 발송했습니다.`,
      })
      setIsInviteDialogOpen(false)
      inviteForm.reset()
    } catch (error) {
      toast({
        title: "초대 실패",
        description: "사용자 초대 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleUpdateUser = async (userId: string, data: UpdateUserForm) => {
    try {
      await updateUser.mutateAsync({ userId, ...data })
      toast({
        title: "사용자 정보 업데이트",
        description: "사용자 정보가 업데이트되었습니다.",
      })
    } catch (error) {
      toast({
        title: "업데이트 실패",
        description: "사용자 정보 업데이트 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteUser.mutateAsync(userId)
      toast({
        title: "사용자 삭제 완료",
        description: "사용자가 삭제되었습니다.",
      })
    } catch (error) {
      toast({
        title: "삭제 실패",
        description: "사용자 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  const userStats = {
    total: users?.length || 0,
    active: users?.filter(u => u.status === 'active').length || 0,
    invited: users?.filter(u => u.status === 'invited').length || 0,
    admins: users?.filter(u => u.role === 'Admin' || u.role === 'Owner').length || 0
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert className="border-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>사용자 목록을 불러오는데 실패했습니다: {error.message}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-3 w-3 mr-1" />
              다시 시도
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            뒤로
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">사용자 관리</h1>
            <p className="text-gray-600">
              팀 멤버를 초대하고 역할을 관리합니다
            </p>
          </div>
        </div>

        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              사용자 초대
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>사용자 초대</DialogTitle>
              <DialogDescription>
                새로운 팀 멤버를 초대합니다
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={inviteForm.handleSubmit(handleInviteUser)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">이메일 주소</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="invite-email"
                    type="email"
                    {...inviteForm.register('email')}
                    placeholder="user@example.com"
                    className="pl-10"
                  />
                </div>
                {inviteForm.formState.errors.email && (
                  <p className="text-sm text-red-600">
                    {inviteForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite-name">이름</Label>
                <Input
                  id="invite-name"
                  {...inviteForm.register('name')}
                  placeholder="홍길동"
                />
                {inviteForm.formState.errors.name && (
                  <p className="text-sm text-red-600">
                    {inviteForm.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>역할</Label>
                <Select
                  value={inviteForm.watch('role')}
                  onValueChange={(value) => inviteForm.setValue('role', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">관리자</SelectItem>
                    <SelectItem value="Staff">직원</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite-message">초대 메시지 (선택)</Label>
                <Textarea
                  id="invite-message"
                  {...inviteForm.register('message')}
                  placeholder="팀에 오신 것을 환영합니다!"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsInviteDialogOpen(false)}
                >
                  취소
                </Button>
                <Button 
                  type="submit" 
                  disabled={inviteUser.isPending}
                >
                  {inviteUser.isPending ? '초대 중...' : '초대하기'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">전체 사용자</p>
                <p className="text-2xl font-bold">{userStats.total}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">활성 사용자</p>
                <p className="text-2xl font-bold">{userStats.active}</p>
              </div>
              <User className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">초대됨</p>
                <p className="text-2xl font-bold">{userStats.invited}</p>
              </div>
              <Mail className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">관리자</p>
                <p className="text-2xl font-bold">{userStats.admins}</p>
              </div>
              <Shield className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <div className="space-y-4">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-48" />
                      <div className="flex gap-2">
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-5 w-12" />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : users && users.length > 0 ? (
          users.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              currentUser={currentUser}
              onUpdate={handleUpdateUser}
              onDelete={handleDeleteUser}
            />
          ))
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                사용자가 없습니다
              </h3>
              <p className="text-gray-600 mb-4">
                첫 번째 팀 멤버를 초대해보세요
              </p>
              <Button onClick={() => setIsInviteDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                사용자 초대
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Role Permissions Info */}
      <Card>
        <CardHeader>
          <CardTitle>역할별 권한</CardTitle>
          <CardDescription>
            각 역할별로 사용할 수 있는 기능을 확인하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Crown className="h-5 w-5 text-yellow-600 mt-1" />
              <div>
                <h4 className="font-medium">소유자 (Owner)</h4>
                <p className="text-sm text-gray-600">
                  모든 기능에 대한 전체 권한. 조직 설정, 사용자 관리, 결제 관리 등
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-600 mt-1" />
              <div>
                <h4 className="font-medium">관리자 (Admin)</h4>
                <p className="text-sm text-gray-600">
                  캠페인 관리, 연락처 관리, 분석 보고서 조회, 팀 멤버 초대
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-gray-600 mt-1" />
              <div>
                <h4 className="font-medium">직원 (Staff)</h4>
                <p className="text-sm text-gray-600">
                  캠페인 생성 및 발송, 연락처 관리, 기본 분석 보고서 조회
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}