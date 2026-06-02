import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../api/client';

interface MutationConfig<TData, TError, TVariables>
  extends Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'> {
  method: 'post' | 'patch' | 'put' | 'delete';
  endpoint: string;
  invalidateQueries?: string[][];
  successMessage?: string;
  errorMessage?: string;
}

export function useApiMutation<TData = any, TError = Error, TVariables = any>(
  config: MutationConfig<TData, TError, TVariables>,
) {
  const queryClient = useQueryClient();
  const { method, endpoint, invalidateQueries, successMessage, errorMessage, ...options } = config;

  return useMutation<TData, TError, TVariables>({
    mutationFn: async (variables: TVariables) => {
      if (method === 'delete') {
        return api.delete<TData>(endpoint);
      }
      return (api as any)[method]<TData>(endpoint, variables);
    },
    onSuccess: (data, variables, context) => {
      if (successMessage) {
        toast.success(successMessage);
      }
      if (invalidateQueries) {
        invalidateQueries.forEach((q) => queryClient.invalidateQueries({ queryKey: q }));
      }
      options.onSuccess?.(data, variables, context);
    },
    onError: (error: any, variables, context) => {
      toast.error(errorMessage || error?.message || 'Erro ao executar operação');
      options.onError?.(error, variables, context);
    },
    ...options,
  } as any);
}
