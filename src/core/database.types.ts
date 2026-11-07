/**
 * 数据库 schema 类型。
 *
 * 手写而非生成：目前只有一张表，为它装一个生成器不划算。
 * 形状与 supabase 的 `createClient<Database>()` 一致，传给 createWorkBuddyCloud
 * 之后 `cloud.database.from('learning_progress')` 就有完整类型。
 */

export interface Database {
  public: {
    Tables: {
      learning_progress: {
        Row: {
          id: number;
          owner_id: string;
          owner_name: string | null;
          opening_id: string;
          lesson_id: string;
          step: number;
          completed: boolean;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          /** 由数据库 DEFAULT auth.uid() 填充，应用代码不要传 */
          owner_id?: string;
          owner_name?: string | null;
          opening_id: string;
          lesson_id: string;
          step?: number;
          completed?: boolean;
          updated_at?: string;
          created_at?: string;
        };
        Update: {
          owner_name?: string | null;
          step?: number;
          completed?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
