import { Link } from 'react-router-dom'

export const NotFound = () => (
  <section data-testid="page-not-found" className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center text-center">
    <p className="font-mono text-sm font-bold tracking-widest text-primary">404</p>
    <h1 className="mt-3 text-xl font-bold text-ink">Không tìm thấy trang</h1>
    <p className="mt-2 text-sm text-muted">Địa chỉ này không tồn tại trong cổng quản trị.</p>
    <Link to="/" className="mt-5 rounded-control bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover">
      Về tổng quan
    </Link>
  </section>
)
