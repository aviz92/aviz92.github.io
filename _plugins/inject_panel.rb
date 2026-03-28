Jekyll::Hooks.register :site, :post_read do |site|
  site.layouts['home'].data['panel_includes'] ||= []
  site.layouts['home'].data['panel_includes'].prepend('categories-list')
end
