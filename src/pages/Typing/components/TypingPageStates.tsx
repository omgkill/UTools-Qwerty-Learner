import Layout from '../../../components/Layout'
import type React from 'react'

export const TypingPageLoading: React.FC = () => (
  <Layout>
    <div className="flex h-full items-center justify-center">
      <div
        className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-400 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
        role="status"
      ></div>
    </div>
  </Layout>
)

type EmptyStateProps = {
  icon: string
  title: string
  description: string
  buttonText: string
  onButtonClick: () => void
}

export const TypingPageEmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  buttonText,
  onButtonClick,
}) => (
  <Layout>
    <div className="flex h-full flex-col items-center justify-center space-y-6">
      <div className="text-6xl">{icon}</div>
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">{title}</h2>
      <p className="text-gray-600 dark:text-gray-400">{description}</p>
      <button
        onClick={onButtonClick}
        className="rounded-lg bg-indigo-500 px-4 py-2 text-white transition-colors hover:bg-indigo-600"
      >
        {buttonText}
      </button>
    </div>
  </Layout>
)
